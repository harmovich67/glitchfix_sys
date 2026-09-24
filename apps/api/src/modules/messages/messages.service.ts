import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { MessageKind, MessageStatus } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { loadProjectAccess, type ProjectAccess } from '../projects/projects.access';
import { settingsService } from '../settings/settings.service';
import { briefUserSelect } from '../users/users.repository';

const messageInclude = {
  author: { select: briefUserSelect },
  moderatedBy: { select: { id: true, name: true } },
} satisfies Prisma.MessageInclude;

/** Which message statuses a viewer may see in a thread. */
function visibleWhere(user: AuthUser, access: ProjectAccess): Prisma.MessageWhereInput {
  if (access.canModerate) return {}; // moderators (incl. Super Admin) see everything, including hidden
  if (access.isClient) return { status: 'VISIBLE' };
  return { OR: [{ status: 'VISIBLE' }, { status: 'PENDING', authorId: user.id }] };
}

async function loadThread(user: AuthUser, threadId: string) {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw notFound('Conversation');
  const access = await loadProjectAccess(user, thread.projectId);
  if (thread.type === 'INTERNAL' && !access.canWork) throw notFound('Conversation');
  return { thread, access };
}

export const messagesService = {
  async listThreads(user: AuthUser, projectId: string) {
    const access = await loadProjectAccess(user, projectId);
    const threads = await prisma.thread.findMany({
      where: { projectId, ...(access.canWork ? {} : { type: 'CLIENT' }) },
      orderBy: { type: 'asc' },
      include: {
        messages: { where: visibleWhere(user, access), orderBy: { createdAt: 'asc' }, include: messageInclude, take: 500 },
      },
    });
    const settings = await settingsService.get();
    return {
      threads,
      developerClientMode: settings.developerClientMode,
      canModerate: access.canModerate,
    };
  },

  async post(req: Request, user: AuthUser, threadId: string, input: { body: string; kind: Exclude<MessageKind, 'SYSTEM'> }) {
    const { thread, access } = await loadThread(user, threadId);
    if (thread.locked && !access.canModerate) throw forbidden('This conversation is locked by an administrator');
    if (input.kind === 'CLARIFICATION' && (access.isClient || thread.type !== 'CLIENT'))
      throw badRequest('Clarification requests are sent by the team in the client conversation');

    let status: MessageStatus = 'VISIBLE';
    if (thread.type === 'CLIENT' && user.role === 'DEVELOPER') {
      const { developerClientMode } = await settingsService.get();
      if (developerClientMode === 'disabled') throw forbidden('Developers cannot message clients directly. Use the internal thread.');
      if (developerClientMode === 'moderated') status = 'PENDING';
    }

    const message = await prisma.message.create({
      data: { threadId, authorId: user.id, body: input.body, kind: input.kind, status },
      include: messageInclude,
    });

    if (input.kind === 'CLARIFICATION') {
      await auditService.log(req, { action: 'clarification.requested', entityType: 'Message', entityId: message.id });
    }
    if (status === 'PENDING') events.emit('message.pending', { messageId: message.id, projectId: thread.projectId, actorId: user.id });
    else events.emit('message.created', { messageId: message.id, projectId: thread.projectId, threadType: thread.type, actorId: user.id });
    return message;
  },

  async moderate(req: Request, user: AuthUser, messageId: string, action: 'approve' | 'hide' | 'unhide') {
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { thread: true } });
    if (!message) throw notFound('Message');
    const access = await loadProjectAccess(user, message.thread.projectId);
    if (!access.canModerate) throw forbidden();
    const status: MessageStatus = action === 'hide' ? 'HIDDEN' : 'VISIBLE';
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { status, moderatedById: user.id, moderatedAt: new Date() },
      include: messageInclude,
    });
    await auditService.log(req, { action: `message.${action}`, entityType: 'Message', entityId: messageId, meta: { previous: message.status } });
    if (action === 'approve' && message.status === 'PENDING') {
      events.emit('message.approved', { messageId, projectId: message.thread.projectId, actorId: user.id });
      events.emit('message.created', {
        messageId,
        projectId: message.thread.projectId,
        threadType: message.thread.type,
        actorId: message.authorId ?? user.id,
      });
    } else {
      events.emit('project.updated', { projectId: message.thread.projectId });
    }
    return updated;
  },

  async resolve(user: AuthUser, messageId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { thread: true } });
    if (!message || message.kind !== 'CLARIFICATION') throw notFound('Clarification');
    const access = await loadProjectAccess(user, message.thread.projectId);
    if (!access.isOwner && !access.canWork) throw forbidden();
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { resolvedAt: message.resolvedAt ? null : new Date() },
      include: messageInclude,
    });
    events.emit('project.updated', { projectId: message.thread.projectId });
    return updated;
  },

  async setLocked(req: Request, user: AuthUser, threadId: string, locked: boolean) {
    const { thread, access } = await loadThread(user, threadId);
    if (!access.canModerate && !access.canManage) throw forbidden();
    const updated = await prisma.thread.update({ where: { id: thread.id }, data: { locked } });
    await auditService.log(req, { action: locked ? 'thread.locked' : 'thread.unlocked', entityType: 'Thread', entityId: thread.id });
    events.emit('project.updated', { projectId: thread.projectId });
    return updated;
  },

  /** Cross-project oversight for moderators. */
  async oversight(status?: MessageStatus) {
    return prisma.message.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 150,
      include: {
        ...messageInclude,
        thread: { select: { id: true, type: true, project: { select: { id: true, code: true, title: true } } } },
      },
    });
  },

  async oversightCounts() {
    const [pending, hidden] = await Promise.all([
      prisma.message.count({ where: { status: 'PENDING' } }),
      prisma.message.count({ where: { status: 'HIDDEN' } }),
    ]);
    return { pending, hidden };
  },
};
