import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { createNoteSchema, createTaskSchema, updateTaskSchema } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { assertWork, loadProjectAccess } from '../projects/projects.access';
import { briefUserSelect } from '../users/users.repository';

const taskInclude = { assignee: { select: briefUserSelect }, createdBy: { select: briefUserSelect } } satisfies Prisma.TaskInclude;

async function assertAssignee(projectId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const member = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!member || member.role === 'CLIENT') throw badRequest('Tasks can only be assigned to team members');
}

export const tasksService = {
  mine: (user: AuthUser) =>
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: 'DONE' } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: { ...taskInclude, project: { select: { id: true, code: true, title: true } } },
    }),

  async list(user: AuthUser, projectId: string) {
    assertWork(await loadProjectAccess(user, projectId));
    return prisma.task.findMany({ where: { projectId }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: taskInclude });
  },

  async create(req: Request, user: AuthUser, projectId: string, input: z.infer<typeof createTaskSchema>) {
    assertWork(await loadProjectAccess(user, projectId));
    await assertAssignee(projectId, input.assigneeId);
    const task = await prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdById: user.id,
      },
      include: taskInclude,
    });
    if (task.assigneeId && task.assigneeId !== user.id)
      events.emit('task.assigned', { taskId: task.id, projectId, actorId: user.id, userId: task.assigneeId });
    events.emit('project.updated', { projectId });
    await auditService.log(req, { action: 'task.created', entityType: 'Task', entityId: task.id });
    return task;
  },

  async update(req: Request, user: AuthUser, taskId: string, input: z.infer<typeof updateTaskSchema>) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task');
    assertWork(await loadProjectAccess(user, task.projectId));
    if (input.assigneeId !== undefined) await assertAssignee(task.projectId, input.assigneeId);
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
      },
      include: taskInclude,
    });
    if (input.assigneeId && input.assigneeId !== task.assigneeId && input.assigneeId !== user.id)
      events.emit('task.assigned', { taskId, projectId: task.projectId, actorId: user.id, userId: input.assigneeId });
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
