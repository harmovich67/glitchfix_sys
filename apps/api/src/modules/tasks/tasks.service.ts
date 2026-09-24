import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { bulkCreateTasksSchema, can, createNoteSchema, createTaskSchema, updateTaskSchema, type WorkflowDefinition } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { assertManage, assertWork, loadProjectAccess } from '../projects/projects.access';
import { projectsRepository } from '../projects/projects.repository';
import { briefUserSelect } from '../users/users.repository';

const taskInclude = { assignee: { select: briefUserSelect }, createdBy: { select: briefUserSelect } } satisfies Prisma.TaskInclude;
const taskWithProject = { ...taskInclude, project: { select: { id: true, code: true, title: true } } } satisfies Prisma.TaskInclude;

/** Finished tickets stay on the cross-project board for this long, then drop off (they remain on the project). */
const DONE_VISIBLE_DAYS = 30;

/** Tickets go to people who are on the project, so a manager builds the team first and then hands out the work. */
async function assertAssignee(projectId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const row = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
    select: { user: { select: { isActive: true, role: true } } },
  });
  if (!row || !row.user.isActive || row.user.role === 'CLIENT')
    throw badRequest('Tickets can only be assigned to people on this project. Add them to the team first.');
}

/** A project manager plans the work of the projects they belong to. */
function assertCanPlan(user: AuthUser, access: Awaited<ReturnType<typeof loadProjectAccess>>) {
  if (user.role === 'PROJECT_MANAGER' && !access.isMember) throw forbidden('You can only create and assign tickets on projects you are part of');
}

const lastNumber = async (tx: Prisma.TransactionClient, projectId: string) =>
  (await tx.task.aggregate({ where: { projectId }, _max: { number: true } }))._max.number ?? 0;

export const tasksService = {
  mine: (user: AuthUser) =>
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: 'DONE' } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: taskWithProject,
    }),

  /**
   * Cross-project ticket board. Developers see tickets in their projects that are theirs or still
   * unclaimed; managers see everything so they can follow progress and unblock people.
   */
  async board(user: AuthUser, filters: { projectId?: string; assigneeId?: string }) {
    const scope: Prisma.TaskWhereInput = can(user.role, 'projects.view_all')
      ? {}
      : { project: { members: { some: { userId: user.id } } }, OR: [{ assigneeId: user.id }, { assigneeId: null }] };
    const since = new Date(Date.now() - DONE_VISIBLE_DAYS * 24 * 3600 * 1000);
    const where: Prisma.TaskWhereInput = {
      AND: [
        scope,
        { OR: [{ status: { not: 'DONE' } }, { completedAt: null }, { completedAt: { gte: since } }] },
        ...(filters.projectId ? [{ projectId: filters.projectId }] : []),
        ...(filters.assigneeId === 'unassigned'
          ? [{ assigneeId: null }]
          : filters.assigneeId
            ? [{ assigneeId: filters.assigneeId === 'me' ? user.id : filters.assigneeId }]
            : []),
      ],
    };
    return prisma.task.findMany({ where, orderBy: [{ updatedAt: 'desc' }], take: 500, include: taskWithProject });
  },

  async list(user: AuthUser, projectId: string) {
    assertWork(await loadProjectAccess(user, projectId));
    return prisma.task.findMany({ where: { projectId }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: taskInclude });
  },

  async create(req: Request, user: AuthUser, projectId: string, input: z.infer<typeof createTaskSchema>) {
    const access = await loadProjectAccess(user, projectId);
    assertWork(access);
    assertCanPlan(user, access);
    await assertAssignee(projectId, input.assigneeId);
    const task = await prisma.$transaction(async (tx) =>
      tx.task.create({
        data: {
          projectId,
          number: (await lastNumber(tx, projectId)) + 1,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId ?? null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          createdById: user.id,
          startedAt: input.status === 'IN_PROGRESS' ? new Date() : null,
          completedAt: input.status === 'DONE' ? new Date() : null,
        },
        include: taskInclude,
      }),
    );
    if (task.assigneeId && task.assigneeId !== user.id)
      events.emit('task.assigned', { taskId: task.id, projectId, actorId: user.id, userId: task.assigneeId });
    events.emit('project.updated', { projectId });
    await auditService.log(req, { action: 'task.created', entityType: 'Task', entityId: task.id });
    return task;
  },

  /** A manager approves an AI/requirements task plan: every accepted ticket becomes a real, traceable ticket. */
  async bulkCreate(req: Request, user: AuthUser, projectId: string, input: z.infer<typeof bulkCreateTasksSchema>) {
    const access = await loadProjectAccess(user, projectId);
    assertManage(access);
    assertCanPlan(user, access);
    if (input.reportId) {
      const report = await prisma.technicalReport.findFirst({ where: { id: input.reportId, projectId }, select: { id: true } });
      if (!report) throw notFound('Report');
    }
    for (const id of new Set(input.tasks.map((t) => t.assigneeId).filter(Boolean))) await assertAssignee(projectId, id);
    const def = access.project.workflowSnapshot as unknown as WorkflowDefinition;
    const stepKeys = new Set(def.steps.map((s) => s.key));

    const created = await prisma.$transaction(async (tx) => {
      let n = await lastNumber(tx, projectId);
      const out = [];
      for (const t of input.tasks) {
        out.push(
          await tx.task.create({
            data: {
              projectId,
              number: ++n,
              source: 'REQUIREMENT',
              stepKey: t.stepKey && stepKeys.has(t.stepKey) ? t.stepKey : null,
              reportId: input.reportId ?? null,
              title: t.title,
              description: t.description,
              status: 'TODO',
              priority: t.priority,
              estimateHours: t.estimateHours ?? null,
              assigneeId: t.assigneeId ?? null,
              dueDate: t.dueDate ? new Date(t.dueDate) : null,
              createdById: user.id,
            },
            include: taskInclude,
          }),
        );
      }
      return out;
    });

    const perAssignee = new Map<string, number>();
    for (const t of created) if (t.assigneeId && t.assigneeId !== user.id) perAssignee.set(t.assigneeId, (perAssignee.get(t.assigneeId) ?? 0) + 1);
    for (const [assigneeId, count] of perAssignee)
      await notificationsService.notify([assigneeId], {
        type: 'task.assigned',
        title: `${count} new ticket${count > 1 ? 's' : ''} on ${access.project.code}`,
        body: `${user.name} assigned you requirement tickets for “${access.project.title}”.`,
        link: '/app?tab=tickets',
      });
    await projectsRepository.addEvent(projectId, {
      type: 'task',
      title: `${created.length} requirement ticket(s) created`,
      actorId: user.id,
      visibility: 'INTERNAL',
      meta: { count: created.length, reportId: input.reportId ?? null },
    });
    await auditService.log(req, { action: 'task.bulk_created', entityType: 'Project', entityId: projectId, meta: { count: created.length, reportId: input.reportId ?? null } });
    events.emit('project.updated', { projectId });
    return created;
  },

  async update(req: Request, user: AuthUser, taskId: string, input: z.infer<typeof updateTaskSchema>) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task');
    const access = await loadProjectAccess(user, task.projectId);
    assertWork(access);
    if (input.assigneeId) assertCanPlan(user, access);

    // Developers move their own tickets (or claim unassigned ones); managers steer everything else.
    const isDeveloper = user.role === 'DEVELOPER';
    if (isDeveloper && task.assigneeId && task.assigneeId !== user.id) throw forbidden('This ticket is assigned to someone else');
    if (isDeveloper && input.assigneeId && input.assigneeId !== user.id) throw forbidden('You can only assign tickets to yourself');
    if (input.assigneeId !== undefined) await assertAssignee(task.projectId, input.assigneeId);

    const moved = input.status !== undefined && input.status !== task.status;
    const next = input.status ?? task.status;
    // A developer starting an unclaimed ticket takes ownership of it.
    const claimed = isDeveloper && moved && !task.assigneeId && input.assigneeId === undefined ? user.id : undefined;
    const blockedReason =
      input.blockedReason === undefined ? undefined : input.blockedReason?.trim() ? input.blockedReason.trim() : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : claimed ? { assigneeId: claimed } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
        ...(input.estimateHours !== undefined ? { estimateHours: input.estimateHours } : {}),
        ...(moved && next === 'IN_PROGRESS' && !task.startedAt ? { startedAt: new Date() } : {}),
        ...(moved ? { completedAt: next === 'DONE' ? new Date() : null } : {}),
        // Finishing a ticket resolves any block.
        ...(moved && next === 'DONE' ? { blockedReason: null } : blockedReason !== undefined ? { blockedReason } : {}),
      },
      include: taskInclude,
    });

    const assignedTo = claimed ?? input.assigneeId;
    if (assignedTo && assignedTo !== task.assigneeId && assignedTo !== user.id)
      events.emit('task.assigned', { taskId, projectId: task.projectId, actorId: user.id, userId: assignedTo });
    if (moved) {
      await projectsRepository.addEvent(task.projectId, {
        type: 'task',
        title: task.title,
        body: `${task.status} → ${next}`,
        actorId: user.id,
        visibility: 'INTERNAL',
        meta: { taskId, from: task.status, to: next },
      });
      events.emit('task.statusChanged', { taskId, projectId: task.projectId, actorId: user.id, from: task.status, to: next });
    }
    if (blockedReason && blockedReason !== task.blockedReason && !(moved && next === 'DONE'))
      events.emit('task.blocked', { taskId, projectId: task.projectId, actorId: user.id });
    events.emit('project.updated', { projectId: task.projectId });
    return updated;
  },

  async remove(req: Request, user: AuthUser, taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task');
    const access = await loadProjectAccess(user, task.projectId);
    assertWork(access);
    if (task.createdById !== user.id && !access.canManage) throw forbidden();
    await prisma.task.delete({ where: { id: taskId } });
    await auditService.log(req, { action: 'task.deleted', entityType: 'Task', entityId: taskId, meta: { title: task.title } });
    events.emit('project.updated', { projectId: task.projectId });
  },

  // ── Technical notes ────────────────────────────────────────────────────────
  async listNotes(user: AuthUser, projectId: string) {
    assertWork(await loadProjectAccess(user, projectId));
    return prisma.note.findMany({
      where: { projectId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: { author: { select: briefUserSelect } },
    });
  },

  async createNote(user: AuthUser, projectId: string, input: z.infer<typeof createNoteSchema>) {
    assertWork(await loadProjectAccess(user, projectId));
    const note = await prisma.note.create({
      data: { projectId, authorId: user.id, body: input.body, pinned: input.pinned ?? false },
      include: { author: { select: briefUserSelect } },
    });
    events.emit('project.updated', { projectId });
    return note;
  },

  async updateNote(user: AuthUser, noteId: string, pinned: boolean) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw notFound('Note');
    assertWork(await loadProjectAccess(user, note.projectId));
    return prisma.note.update({ where: { id: noteId }, data: { pinned }, include: { author: { select: briefUserSelect } } });
  },

  async removeNote(user: AuthUser, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw notFound('Note');
    const access = await loadProjectAccess(user, note.projectId);
    if (note.authorId !== user.id && !access.canManage) throw forbidden();
    await prisma.note.delete({ where: { id: noteId } });
  },
};
