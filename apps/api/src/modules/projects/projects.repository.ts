import { Prisma } from '@prisma/client';
import type { AnswerMap, WorkflowDefinition } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { briefUserSelect } from '../users/users.repository';

export const projectListInclude = {
  client: { select: { ...briefUserSelect, clientProfile: { select: { companyName: true } } } },
  members: { include: { user: { select: briefUserSelect } } },
  _count: { select: { files: true, tasks: true } },
} satisfies Prisma.ProjectInclude;

export const projectDetailInclude = {
  client: {
    select: {
      ...briefUserSelect,
      locale: true,
      createdAt: true,
      clientProfile: { select: { companyName: true, industry: true, country: true, phone: true, website: true } },
    },
  },
  members: {
    orderBy: { assignedAt: 'asc' },
    include: { user: { select: { ...briefUserSelect, developerProfile: { select: { title: true, skills: true } } } } },
  },
  answers: true,
  steps: true,
  template: { select: { id: true, name: true, version: true } },
  fixRequest: true,
} satisfies Prisma.ProjectInclude;

export type ProjectDetailRow = Prisma.ProjectGetPayload<{ include: typeof projectDetailInclude }>;

export interface NewEvent {
  type: string;
  title: string;
  body?: string | null;
  actorId?: string | null;
  visibility?: 'CLIENT' | 'INTERNAL';
  meta?: Record<string, unknown>;
}

export const projectsRepository = {
  list: (where: Prisma.ProjectWhereInput) =>
    prisma.project.findMany({ where, include: projectListInclude, orderBy: { updatedAt: 'desc' }, take: 500 }),

  findDetail: (id: string) => prisma.project.findUnique({ where: { id }, include: projectDetailInclude }),
  findBasic: (id: string) =>
    prisma.project.findUnique({ where: { id }, include: { members: { select: { userId: true, role: true } } } }),

  /** Next human-friendly code (WLC-1001…). `offset` lets callers step past a concurrent insert. */
  async nextCode(offset = 0): Promise<string> {
    const rows = await prisma.project.findMany({ select: { code: true } });
    const max = rows.reduce((m, r) => Math.max(m, Number(r.code.replace(/\D/g, '')) || 0), 1000);
    return `WLC-${max + 1 + offset}`;
  },

  async create(data: { code: string; title: string; clientId: string; templateId: string; snapshot: WorkflowDefinition }) {
    return prisma.project.create({
      data: {
        code: data.code,
        title: data.title,
        clientId: data.clientId,
        templateId: data.templateId,
        workflowSnapshot: data.snapshot as unknown as Prisma.InputJsonValue,
        threads: { create: [{ type: 'CLIENT' }, { type: 'INTERNAL' }] },
        steps: { create: data.snapshot.steps.map((s) => ({ stepKey: s.key })) },
      },
    });
  },

  async upsertAnswers(projectId: string, entries: { questionKey: string; stepKey: string; value: AnswerMap[string] }[]) {
    await prisma.$transaction(
      entries.map((e) =>
        e.value === null || e.value === undefined
          ? prisma.answer.deleteMany({ where: { projectId, questionKey: e.questionKey } })
          : prisma.answer.upsert({
              where: { projectId_questionKey: { projectId, questionKey: e.questionKey } },
              create: { projectId, questionKey: e.questionKey, stepKey: e.stepKey, value: e.value as Prisma.InputJsonValue },
              update: { value: e.value as Prisma.InputJsonValue, stepKey: e.stepKey },
            }),
      ),
    );
  },

  async answerMap(projectId: string): Promise<AnswerMap> {
    const rows = await prisma.answer.findMany({ where: { projectId } });
    return Object.fromEntries(rows.map((r) => [r.questionKey, r.value as AnswerMap[string]]));
  },

  setStepStatus: (projectId: string, stepKey: string, status: string) =>
    prisma.projectStep.upsert({
      where: { projectId_stepKey: { projectId, stepKey } },
      create: { projectId, stepKey, status, completedAt: status === 'COMPLETED' ? new Date() : null },
      update: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
    }),

  update: (id: string, data: Prisma.ProjectUncheckedUpdateInput) => prisma.project.update({ where: { id }, data }),

  addEvent: (projectId: string, e: NewEvent) =>
    prisma.projectEvent.create({
      data: {
        projectId,
        type: e.type,
        title: e.title,
        body: e.body ?? null,
        actorId: e.actorId ?? null,
        visibility: e.visibility ?? 'CLIENT',
        meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),

  events: (projectId: string, includeInternal: boolean) =>
    prisma.projectEvent.findMany({
      where: { projectId, ...(includeInternal ? {} : { visibility: 'CLIENT' }) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: briefUserSelect } },
    }),
};
