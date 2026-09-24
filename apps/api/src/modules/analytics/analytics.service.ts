import { PROJECT_STATUSES, allQuestions, formatAnswer, type AnswerMap, type WorkflowDefinition } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { briefUserSelect } from '../users/users.repository';

const DAY = 24 * 3600 * 1000;

export const analyticsService = {
  async overview(rangeDays = 90) {
    const since = new Date(Date.now() - rangeDays * DAY);
    const projects = await prisma.project.findMany({
      select: {
        id: true, status: true, projectType: true, createdAt: true, submittedAt: true, approvedAt: true,
        progress: true, workflowSnapshot: true, answers: { select: { questionKey: true, value: true } },
      },
    });
    const inRange = projects.filter((p) => p.createdAt >= since);

    const submitted = inRange.filter((p) => p.submittedAt);
    const conversionRate = inRange.length ? Math.round((submitted.length / inRange.length) * 1000) / 10 : 0;
    const avgDaysToSubmit = submitted.length
      ? Math.round((submitted.reduce((n, p) => n + (p.submittedAt!.getTime() - p.createdAt.getTime()), 0) / submitted.length / DAY) * 10) / 10
      : 0;

    const byStatus = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    projects.forEach((p) => (byStatus[p.status] = (byStatus[p.status] ?? 0) + 1));

    // Resolve type & feature labels from each project's own workflow snapshot.
    const typeCounts = new Map<string, { value: string; label: string; count: number }>();
    const featureCounts = new Map<string, { label: string; count: number }>();
    for (const p of inRange) {
      const def = p.workflowSnapshot as unknown as WorkflowDefinition;
      const qs = new Map(allQuestions(def).map((q) => [q.key, q]));
      const answers: AnswerMap = Object.fromEntries(p.answers.map((a) => [a.questionKey, a.value as AnswerMap[string]]));
      if (p.projectType) {
        const q = qs.get('project_type');
        const label = q ? formatAnswer(q, p.projectType)[0] : p.projectType;
        const cur = typeCounts.get(p.projectType) ?? { value: p.projectType, label, count: 0 };
        cur.count++;
        typeCounts.set(p.projectType, cur);
      }
      for (const [key, value] of Object.entries(answers)) {
        const q = qs.get(key);
        if (!q || q.type !== 'feature_checklist' || !Array.isArray(value)) continue;
        for (const label of formatAnswer(q, value)) {
          const cur = featureCounts.get(label) ?? { label, count: 0 };
          cur.count++;
          featureCounts.set(label, cur);
        }
      }
    }

    // Weekly trend (12 weeks): started vs submitted.
    const weeks: { week: string; started: number; submitted: number }[] = [];
    const start = new Date(Date.now() - 11 * 7 * DAY);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const from = new Date(start.getTime() + i * 7 * DAY);
      const to = new Date(from.getTime() + 7 * DAY);
      weeks.push({
        week: from.toISOString().slice(0, 10),
        started: projects.filter((p) => p.createdAt >= from && p.createdAt < to).length,
        submitted: projects.filter((p) => p.submittedAt && p.submittedAt >= from && p.submittedAt < to).length,
      });
    }

    const funnel = [
      { stage: 'started', count: inRange.length },
      { stage: 'engaged', count: inRange.filter((p) => p.progress > 0).length },
      { stage: 'submitted', count: submitted.length },
      { stage: 'approved', count: inRange.filter((p) => p.approvedAt).length },
      { stage: 'completed', count: inRange.filter((p) => p.status === 'COMPLETED').length },
    ];

    const [clients, newClients, team, recent, pendingMessages, aiRequests] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: since } } }),
      prisma.user.findMany({
        where: { role: { in: ['DEVELOPER', 'PROJECT_MANAGER'] }, isActive: true },
        select: {
          ...briefUserSelect,
          developerProfile: { select: { capacity: true, title: true } },
          memberships: { where: { project: { status: { not: 'COMPLETED' } } }, select: { id: true } },
          tasksAssigned: { where: { status: { not: 'DONE' } }, select: { id: true } },
        },
      }),
      prisma.projectEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { actor: { select: briefUserSelect }, project: { select: { id: true, code: true, title: true } } },
      }),
      prisma.message.count({ where: { status: 'PENDING' } }),
      prisma.aIUsage.count({ where: { createdAt: { gte: since }, kind: { not: 'TEST' } } }),
    ]);

    return {
      rangeDays,
      kpis: {
        requests: inRange.length,
        submitted: submitted.length,
        conversionRate,
        avgDaysToSubmit,
        active: projects.filter((p) => p.submittedAt && p.status !== 'COMPLETED').length,
        completed: byStatus.COMPLETED,
        clients,
        newClients,
        pendingMessages,
        aiRequests,
        awaitingReview: byStatus.UNDER_REVIEW,
      },
      byStatus,
      byType: [...typeCounts.values()].sort((a, b) => b.count - a.count),
      topFeatures: [...featureCounts.values()].sort((a, b) => b.count - a.count).slice(0, 12),
      weekly: weeks,
      funnel,
      workload: team
        .map(({ memberships, tasksAssigned, developerProfile, ...u }) => ({
          ...u,
          title: developerProfile?.title ?? null,
          capacity: developerProfile?.capacity ?? 5,
          activeProjects: memberships.length,
          openTasks: tasksAssigned.length,
        }))
        .sort((a, b) => b.activeProjects - a.activeProjects),
      recent,
    };
  },
};
