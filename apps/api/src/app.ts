import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { aiRoutes } from './modules/ai/ai.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { filesRoutes, projectFilesRoutes } from './modules/files/files.routes';
import { messagesRoutes, moderationRoutes, projectThreadsRoutes, threadsRoutes } from './modules/messages/messages.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { projectsRoutes } from './modules/projects/projects.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { timeOffRoutes } from './modules/timeoff/timeoff.routes';
import { notesRoutes, projectNotesRoutes, projectTasksRoutes, tasksRoutes } from './modules/tasks/tasks.routes';
import { clientsRoutes, usersRoutes } from './modules/users/users.routes';
import { workflowsRoutes } from './modules/workflows/workflows.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', globalLimiter, authenticate);

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/workflows', workflowsRoutes);
  app.use('/api/projects/:id/files', projectFilesRoutes);
  app.use('/api/projects/:id/threads', projectThreadsRoutes);
  app.use('/api/projects/:id/tasks', projectTasksRoutes);
  app.use('/api/projects/:id/notes', projectNotesRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/files', filesRoutes);
  app.use('/api/threads', threadsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/time-off', timeOffRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
