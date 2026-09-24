import { Router } from 'express';
import { markReadSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser } from '../../core/http';
import { notificationsService } from './notifications.service';

export const notificationsRoutes = Router();
notificationsRoutes.use(requireAuth);

notificationsRoutes.get('/', async (req, res) => {
  const user = currentUser(req);
  const [items, unread] = await Promise.all([notificationsService.list(user.id), notificationsService.unreadCount(user.id)]);
  res.json({ items, unread });
});

notificationsRoutes.post('/read', validate(markReadSchema), async (req, res) => {
  await notificationsService.markRead(currentUser(req).id, req.body.all ? undefined : req.body.ids);
  res.status(204).end();
});
