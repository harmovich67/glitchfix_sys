import { Router } from 'express';
import { MESSAGE_STATUSES, moderateMessageSchema, postMessageSchema, updateThreadSchema, type MessageStatus } from '@welco/shared';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { messagesService } from './messages.service';

export const projectThreadsRoutes = Router({ mergeParams: true });
projectThreadsRoutes.use(requireAuth);
projectThreadsRoutes.get('/', async (req, res) => {
  res.json(await messagesService.listThreads(currentUser(req), param(req, 'id')));
});

export const threadsRoutes = Router();
threadsRoutes.use(requireAuth);
threadsRoutes.post('/:id/messages', validate(postMessageSchema), async (req, res) => {
  res.status(201).json(await messagesService.post(req, currentUser(req), param(req, 'id'), req.body));
});
threadsRoutes.patch('/:id', validate(updateThreadSchema), async (req, res) => {
  res.json(await messagesService.setLocked(req, currentUser(req), param(req, 'id'), req.body.locked));
});

export const messagesRoutes = Router();
messagesRoutes.use(requireAuth);
messagesRoutes.patch('/:id/moderate', validate(moderateMessageSchema), async (req, res) => {
  res.json(await messagesService.moderate(req, currentUser(req), param(req, 'id'), req.body.action));
});
messagesRoutes.post('/:id/resolve', async (req, res) => {
  res.json(await messagesService.resolve(currentUser(req), param(req, 'id')));
});

export const moderationRoutes = Router();
moderationRoutes.use(requirePermission('messages.moderate'));
moderationRoutes.get('/', async (req, res) => {
  const s = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const status = s && (MESSAGE_STATUSES as readonly string[]).includes(s) ? (s as MessageStatus) : undefined;
  const [items, counts] = await Promise.all([messagesService.oversight(status), messagesService.oversightCounts()]);
  res.json({ items, counts });
});
