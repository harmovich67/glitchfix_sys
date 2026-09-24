import type { Role } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { events } from '../../core/events';
import { realtime } from '../../realtime/socket';
import { settingsService } from '../settings/settings.service';
import { STATUS_LABELS } from '../projects/projects.service';
import { sendEmail } from './email';

interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
}

const MANAGERS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'];
const MODERATORS: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export const notificationsService = {
  async notify(userIds: string[], input: NotifyInput) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (!ids.length) return;
    const created = await prisma.$transaction(
      ids.map((userId) =>
        prisma.notification.create({ data: { userId, type: input.type, title: input.title, body: input.body, link: input.link } }),
      ),
    );
    created.forEach((n) => realtime.toUser(n.userId, 'notification:new', n));

    if (input.email && (await settingsService.get()).emailNotifications) {
      const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { email: true } });
      await sendEmail(users.map((u) => u.email), input.title, input.body ?? '', input.link);
    }
  },

  list: (userId: string) =>
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),

  markRead: (userId: string, ids?: string[]) =>
    prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    }),
};

async function usersByRole(roles: Role[], exclude?: string) {
  const users = await prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  return users.map((u) => u.id).filter((id) => id !== exclude);
}

async function projectContext(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, title: true, clientId: true, members: { select: { userId: true } } },
  });
}

const link = (projectId: string, tab?: string) => `/app/projects/${projectId}${tab ? `?tab=${tab}` : ''}`;

/** Wire domain events to notifications, email and realtime invalidation. */
export function registerNotificationListeners() {
  events.on('project.submitted', async ({ projectId, actorId }) => {
    const p = await projectContext(projectId);
    if (!p) return;
    await notificationsService.notify(await usersByRole(MANAGERS, actorId), {
      type: 'project.submitted',
      title: `New project submitted · ${p.code}`,
      body: `“${p.title}” is ready for review.`,
      link: link(projectId),
      email: true,
    });
    realtime.projectChanged(projectId, 'project');
  });

  events.on('project.statusChanged', async ({ projectId, actorId, to }) => {
    const p = await projectContext(projectId);
    if (!p || actorId === p.clientId) return realtime.projectChanged(projectId, 'project');
    await notificationsService.notify([p.clientId], {
      type: 'project.status',
      title: `${p.code} is now in ${STATUS_LABELS[to]}`,
      body: `Your project “${p.title}” moved to ${STATUS_LABELS[to]}.`,
      link: link(projectId),
      email: true,
    });
    await notificationsService.notify(p.members.map((m) => m.userId).filter((id) => id !== actorId), {
      type: 'project.status',
      title: `${p.code} → ${STATUS_LABELS[to]}`,
      link: link(projectId),
    });
    realtime.projectChanged(projectId, 'project');
  });

  events.on('project.assigned', async ({ projectId, userId, actorId, role }) => {
    const p = await projectContext(projectId);
    if (!p) return;
    if (userId !== actorId)
      await notificationsService.notify([userId], {
        type: 'project.assigned',
        title: `You were assigned to ${p.code}`,
        body: `You joined “${p.title}” as ${role === 'MANAGER' ? 'project manager' : 'developer'}.`,
        link: link(projectId),
        email: true,
      });
    realtime.projectChanged(projectId, 'project');
  });

  for (const ev of ['project.approved', 'project.reopened'] as const) {
    events.on(ev, async ({ projectId }) => {
      const p = await projectContext(projectId);
      if (!p) return;
      await notificationsService.notify([p.clientId], {
        type: ev,
        title: ev === 'project.approved' ? `Requirements approved · ${p.code}` : `Requirements reopened · ${p.code}`,
        body:
          ev === 'project.approved'
            ? 'Your requirements are approved and the team is moving forward.'
            : 'You can now edit your requirements again.',
        link: link(projectId),
      });
      realtime.projectChanged(projectId, 'project');
    });
  }

  events.on('message.created', async ({ messageId, projectId, threadType, actorId }) => {
    const [p, message] = await Promise.all([
      projectContext(projectId),
      prisma.message.findUnique({ where: { id: messageId }, include: { author: { select: { name: true } } } }),
    ]);
    if (!p || !message) return;
    // Unassigned projects route team-side notifications to managers so nothing goes unanswered.
    const members = p.members.length ? p.members.map((m) => m.userId) : await usersByRole(MANAGERS);
    const recipients = (threadType === 'CLIENT' ? [...members, p.clientId] : members).filter((id) => id !== actorId);
    const clarification = message.kind === 'CLARIFICATION';
    await notificationsService.notify(recipients, {
      type: clarification ? 'clarification' : 'message',
      title: clarification
        ? `Clarification requested on ${p.code}`
        : `${message.author?.name ?? 'Someone'} · ${threadType === 'INTERNAL' ? 'internal' : p.code}`,
      body: message.body.slice(0, 160),
      link: link(projectId, threadType === 'INTERNAL' ? 'workspace' : 'conversation'),
      email: clarification,
    });
    realtime.projectChanged(projectId, 'messages');
  });

  events.on('message.pending', async ({ projectId, actorId }) => {
    const p = await projectContext(projectId);
    if (!p) return;
    await notificationsService.notify(await usersByRole(MODERATORS, actorId), {
      type: 'message.pending',
      title: `Message awaiting approval · ${p.code}`,
      body: 'A developer message to the client is waiting for moderation.',
      link: '/app/moderation',
    });
    realtime.projectChanged(projectId, 'messages');
  });

  events.on('message.approved', async ({ messageId, actorId }) => {
    const m = await prisma.message.findUnique({ where: { id: messageId } });
    if (m?.authorId && m.authorId !== actorId)
      await notificationsService.notify([m.authorId], { type: 'message.approved', title: 'Your message was approved and delivered' });
  });

  events.on('file.uploaded', async ({ projectId, category, actorId }) => {
    if (category === 'PREVIEW') {
      const p = await projectContext(projectId);
      if (p && p.clientId !== actorId)
        await notificationsService.notify([p.clientId], {
          type: 'preview',
          title: `New preview available · ${p.code}`,
          body: 'The team shared a new preview of your project.',
          link: link(projectId, 'files'),
          email: true,
        });
    }
    realtime.projectChanged(projectId, 'files');
  });

  events.on('task.assigned', async ({ projectId, userId, taskId }) => {
    const [p, task] = await Promise.all([projectContext(projectId), prisma.task.findUnique({ where: { id: taskId } })]);
    if (!p || !task) return;
    await notificationsService.notify([userId], {
      type: 'task.assigned',
      title: `New task on ${p.code}`,
      body: task.title,
      link: link(projectId, 'workspace'),
    });
  });

  events.on('project.updated', ({ projectId }) => realtime.projectChanged(projectId, 'project'));
  events.on('project.created', async ({ projectId }) => realtime.projectChanged(projectId, 'project'));
}
