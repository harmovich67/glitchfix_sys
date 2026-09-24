import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import {
  DRAFT_STATUSES,
  FINANCIAL_QUESTION_KEYS,
  allQuestions,
  can,
  journeyProgress,
  stripFinancials,
  validateJourney,
  visibleSteps,
  type AnswerMap,
  type ProjectStatus,
  type SaveAnswersInput,
  type WorkflowDefinition,
  addMemberSchema,
  projectListQuery,
  updateProjectSchema,
} from '@welco/shared';
import { AppError, badRequest, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import { prisma } from '../../core/prisma';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { workflowsService } from '../workflows/workflows.service';
import { assertManage, loadProjectAccess } from './projects.access';
import { projectsRepository } from './projects.repository';
import { parseBriefs } from '../ai/brief-store';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  STARTED: 'Started',
  REQUIREMENTS: 'Requirements Gathering',
  UNDER_REVIEW: 'Under Review',
  DESIGN: 'Design Phase',
  DEVELOPMENT: 'Development Phase',
  TESTING: 'Testing',
  COMPLETED: 'Completed',
};

const snapshotOf = (p: { workflowSnapshot: Prisma.JsonValue }) => p.workflowSnapshot as unknown as WorkflowDefinition;

/**
 * Admins staff every project. A project manager builds the team of the projects they belong to, and only with
 * developers — they cannot pull in other managers or admins.
 */
function assertCanStaff(user: AuthUser, access: Awaited<ReturnType<typeof loadProjectAccess>>) {
  if (!access.canAssign) throw forbidden();
  if (user.role === 'PROJECT_MANAGER' && !access.isMember) throw forbidden('You can only manage the team of projects you are part of');
}

export const projectsService = {
  async list(user: AuthUser, filter: z.infer<typeof projectListQuery>) {
    const where: Prisma.ProjectWhereInput = {};
    if (user.role === 'CLIENT') where.clientId = user.id;
    else if (!can(user.role, 'projects.view_all')) where.members = { some: { userId: user.id } };
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.clientId && user.role !== 'CLIENT') where.clientId = filter.clientId;
    if (filter.q) where.OR = [{ title: { contains: filter.q } }, { code: { contains: filter.q } }, { client: { name: { contains: filter.q } } }];
    return projectsRepository.list(where);
  },

  async create(req: Request, user: AuthUser, input: { title?: string }) {
    if (user.role !== 'CLIENT') throw forbidden('Projects are started by clients');
    const snapshot = await workflowsService.defaultDefinition();
    let project;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        project = await projectsRepository.create({
          code: await projectsRepository.nextCode(attempt),
          title: input.title?.trim() || 'Untitled project',
          clientId: user.id,
          templateId: snapshot.templateId,
          snapshot,
        });
        break;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    if (!project) throw new AppError(500, 'CODE_COLLISION', 'Could not allocate a project code, please retry');
    await projectsRepository.addEvent(project.id, { type: 'created', title: 'Project started', actorId: user.id });
    await auditService.log(req, { action: 'project.created', entityType: 'Project', entityId: project.id });
    events.emit('project.created', { projectId: project.id, actorId: user.id });
    return project;
  },

  async get(user: AuthUser, id: string) {
    const access = await loadProjectAccess(user, id);
    const p = await projectsRepository.findDetail(id);
    if (!p) throw notFound('Project');
    let answers: AnswerMap = Object.fromEntries(p.answers.map((a) => [a.questionKey, a.value as AnswerMap[string]]));
    let workflow = p.workflowSnapshot as unknown as WorkflowDefinition;
    // The client's budget is a price: only the client and people cleared for finances get to read it.
    if (!access.isOwner && !access.canViewFinance) ({ def: workflow, answers } = stripFinancials(workflow, answers));
    const { answers: _a, workflowSnapshot: _w, aiBrief, ...rest } = p;
    return {
      ...rest,
      aiBriefs: access.isClient ? null : parseBriefs(aiBrief, p.updatedAt),
      workflow,
      answers,
      access: {
        canEditAnswers: access.canEditAnswers,
        canWork: access.canWork,
        canManage: access.canManage,
        canAssign: access.canAssign,
        canModerate: access.canModerate,
        canViewFinance: access.canViewFinance,
        isOwner: access.isOwner,
      },
    };
  },

  async saveAnswers(req: Request, user: AuthUser, id: string, input: SaveAnswersInput) {
    const access = await loadProjectAccess(user, id);
    if (!access.canEditAnswers)
      throw forbidden(access.project.approvedAt ? 'Requirements are approved and locked' : 'You cannot edit this project');
    if (!access.isOwner && !access.canViewFinance && Object.keys(input.answers).some((k) => FINANCIAL_QUESTION_KEYS.includes(k)))
      throw forbidden('You are not allowed to see or change the budget');
    const project = access.project;
    const def = snapshotOf(project);
    const questionStep = new Map(allQuestions(def).map((q) => [q.key, q.stepKey]));

    const entries = Object.entries(input.answers).map(([questionKey, value]) => {
      const stepKey = questionStep.get(questionKey);
      if (!stepKey) throw badRequest(`Unknown question "${questionKey}"`);
      return { questionKey, stepKey, value };
    });
    await projectsRepository.upsertAnswers(id, entries);
    if (input.completedStepKey) await projectsRepository.setStepStatus(id, input.completedStepKey, 'COMPLETED');

    const answers = await projectsRepository.answerMap(id);
    const projectType = typeof answers.project_type === 'string' ? answers.project_type : null;
    const name = typeof answers.project_name === 'string' && answers.project_name.trim() ? answers.project_name.trim().slice(0, 120) : null;
    const data: Prisma.ProjectUncheckedUpdateInput = {
      progress: journeyProgress(def, answers),
      projectType,
      ...(name ? { title: name } : {}),
      ...(input.currentStepKey ? { currentStepKey: input.currentStepKey } : {}),
    };
    if (project.status === 'STARTED' && entries.length) data.status = 'REQUIREMENTS';
    const updated = await projectsRepository.update(id, data);

    if (project.submittedAt && entries.length) {
      // Post-submission edits are surfaced to the team.
      const recent = await prisma.projectEvent.findFirst({
        where: { projectId: id, type: 'requirements_updated', createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
      });
      if (!recent)
        await projectsRepository.addEvent(id, {
          type: 'requirements_updated',
          title: 'Requirements updated',
          body: `${user.name} changed ${entries.length} answer(s)`,
          actorId: user.id,
          visibility: 'INTERNAL',
        });
    }
    if (data.status) events.emit('project.statusChanged', { projectId: id, actorId: user.id, from: 'STARTED', to: 'REQUIREMENTS' });
    events.emit('project.updated', { projectId: id });
    return { progress: updated.progress, status: updated.status, title: updated.title, projectType: updated.projectType };
  },

  async submit(req: Request, user: AuthUser, id: string) {
    const access = await loadProjectAccess(user, id);
    if (!access.isOwner) throw forbidden('Only the client can submit the project');
    const project = access.project;
    if (project.approvedAt) throw badRequest('Requirements are already approved');
    const def = snapshotOf(project);
    const answers = await projectsRepository.answerMap(id);
    const issues = validateJourney(def, answers);
    if (issues.length) throw new AppError(422, 'INCOMPLETE', 'Some required answers are missing', { issues });

    const visible = new Set(visibleSteps(def, answers).map((s) => s.key));
    await Promise.all(def.steps.map((s) => projectsRepository.setStepStatus(id, s.key, visible.has(s.key) ? 'COMPLETED' : 'SKIPPED')));

    const resubmission = !!project.submittedAt;
    const from = project.status as ProjectStatus;
    const toReview = DRAFT_STATUSES.includes(from) || from === 'UNDER_REVIEW';
    await projectsRepository.update(id, {
      submittedAt: new Date(),
      progress: journeyProgress(def, answers),
      ...(toReview ? { status: 'UNDER_REVIEW' } : {}),
    });
    await projectsRepository.addEvent(id, {
      type: 'submitted',
      title: resubmission ? 'Requirements re-submitted' : 'Requirements submitted',
      body: 'The team will review your requirements and get back to you shortly.',
      actorId: user.id,
    });
    await auditService.log(req, { action: 'project.submitted', entityType: 'Project', entityId: id });
    events.emit('project.submitted', { projectId: id, actorId: user.id });
    if (toReview && from !== 'UNDER_REVIEW') events.emit('project.statusChanged', { projectId: id, actorId: user.id, from, to: 'UNDER_REVIEW' });
    return this.get(user, id);
  },

  async update(req: Request, user: AuthUser, id: string, input: z.infer<typeof updateProjectSchema>) {
    const access = await loadProjectAccess(user, id);
    assertManage(access);
    const before = access.project;
    const data: Prisma.ProjectUncheckedUpdateInput = {};
    if (input.title) data.title = input.title;
    if (input.priority) data.priority = input.priority;
    if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    const statusChanged = input.status && input.status !== before.status;
    if (statusChanged) data.status = input.status;
    await projectsRepository.update(id, data);

    if (statusChanged) {
      const to = input.status as ProjectStatus;
      await projectsRepository.addEvent(id, {
        type: 'status',
        title: `Moved to ${STATUS_LABELS[to]}`,
        actorId: user.id,
        meta: { from: before.status, to },
      });
      events.emit('project.statusChanged', { projectId: id, actorId: user.id, from: before.status as ProjectStatus, to });
    }
    if (input.priority && input.priority !== before.priority)
      await projectsRepository.addEvent(id, { type: 'priority', title: `Priority set to ${input.priority.toLowerCase()}`, actorId: user.id, visibility: 'INTERNAL' });
    if (input.dueDate !== undefined && String(input.dueDate) !== String(before.dueDate?.toISOString() ?? null))
      await projectsRepository.addEvent(id, {
        type: 'due_date',
        title: input.dueDate ? 'Delivery date scheduled' : 'Delivery date cleared',
        actorId: user.id,
        meta: { dueDate: input.dueDate },
      });

    await auditService.log(req, { action: 'project.updated', entityType: 'Project', entityId: id, meta: { ...input, previousStatus: before.status } });
    events.emit('project.updated', { projectId: id });
    return this.get(user, id);
  },

  async approve(req: Request, user: AuthUser, id: string) {
    const access = await loadProjectAccess(user, id);
    assertManage(access);
    if (!access.project.submittedAt) throw badRequest('The client has not submitted requirements yet');
    await projectsRepository.update(id, { approvedAt: new Date() });
    await projectsRepository.addEvent(id, {
      type: 'approved',
      title: 'Requirements approved',
      body: 'Your requirements are approved and locked. Changes from here are handled through the conversation.',
      actorId: user.id,
    });
    await auditService.log(req, { action: 'project.approved', entityType: 'Project', entityId: id });
    events.emit('project.approved', { projectId: id, actorId: user.id });
    return this.get(user, id);
  },

  async reopen(req: Request, user: AuthUser, id: string) {
    const access = await loadProjectAccess(user, id);
    assertManage(access);
    await projectsRepository.update(id, { approvedAt: null });
    await projectsRepository.addEvent(id, {
      type: 'reopened',
      title: 'Requirements reopened for editing',
      actorId: user.id,
    });
    await auditService.log(req, { action: 'project.reopened', entityType: 'Project', entityId: id });
    events.emit('project.reopened', { projectId: id, actorId: user.id });
    return this.get(user, id);
  },

  async addMember(req: Request, user: AuthUser, id: string, input: z.infer<typeof addMemberSchema>) {
    const access = await loadProjectAccess(user, id);
    assertCanStaff(user, access);
    const member = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!member || member.role === 'CLIENT' || !member.isActive) throw badRequest('Choose an active team member');
    if (user.role === 'PROJECT_MANAGER' && (member.role !== 'DEVELOPER' || input.role !== 'DEVELOPER'))
      throw forbidden('Project managers can add developers to their project');
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId: input.userId } },
      create: { projectId: id, userId: input.userId, role: input.role },
      update: { role: input.role },
    });
    await projectsRepository.addEvent(id, {
      type: 'assigned',
      title: `${member.name} joined as ${input.role === 'MANAGER' ? 'project manager' : 'developer'}`,
      actorId: user.id,
      meta: { userId: member.id, role: input.role },
    });
    await auditService.log(req, { action: 'project.member_added', entityType: 'Project', entityId: id, meta: input });
    events.emit('project.assigned', { projectId: id, actorId: user.id, userId: member.id, role: input.role });
    return this.get(user, id);
  },

  async removeMember(req: Request, user: AuthUser, id: string, userId: string) {
    const access = await loadProjectAccess(user, id);
    assertCanStaff(user, access);
    if (user.role === 'PROJECT_MANAGER') {
      const target = access.project.members.find((m) => m.userId === userId);
      if (target?.role === 'MANAGER') throw forbidden('Project managers can only remove developers');
    }
    await prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
    await projectsRepository.addEvent(id, { type: 'unassigned', title: 'Team member removed', actorId: user.id, visibility: 'INTERNAL', meta: { userId } });
    await auditService.log(req, { action: 'project.member_removed', entityType: 'Project', entityId: id, meta: { userId } });
    events.emit('project.updated', { projectId: id });
    return this.get(user, id);
  },

  async timeline(user: AuthUser, id: string) {
    const access = await loadProjectAccess(user, id);
    const events = await projectsRepository.events(id, !access.isClient);
    // Offers are finance: staff without finance access never see that a proposal was drafted or sent.
    return access.isClient || access.canViewFinance ? events : events.filter((e) => e.type !== 'proposal');
  },

  async remove(req: Request, user: AuthUser, id: string) {
    if (!can(user.role, 'projects.delete')) throw forbidden();
    const p = await projectsRepository.findBasic(id);
    if (!p) throw notFound('Project');
    await prisma.project.delete({ where: { id } });
    await auditService.log(req, { action: 'project.deleted', entityType: 'Project', entityId: id, meta: { code: p.code, title: p.title } });
  },
};
