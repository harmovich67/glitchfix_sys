import { Router } from 'express';
import {
  aiChatSchema,
  aiImproveSchema,
  aiSettingsSchema,
  taskPlanSchema,
  technicalReportGenerateSchema,
  technicalReportShareSchema,
} from '@welco/shared';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { aiService } from './ai.service';

export const aiRoutes = Router();

aiRoutes.get('/status', requireAuth, async (req, res) => res.json(await aiService.status(currentUser(req))));

aiRoutes.get('/projects/:id/messages', requireAuth, async (req, res) =>
  res.json(await aiService.history(currentUser(req), param(req, 'id'))),
);

aiRoutes.post('/chat', requireAuth, aiLimiter, validate(aiChatSchema), async (req, res) =>
  res.json(await aiService.chat(currentUser(req), req.body)),
);

aiRoutes.post('/improve', requireAuth, aiLimiter, validate(aiImproveSchema), async (req, res) =>
  res.json(await aiService.improve(currentUser(req), req.body)),
);

aiRoutes.post('/projects/:id/brief', requireAuth, aiLimiter, async (req, res) =>
  res.json(await aiService.brief(req, currentUser(req), param(req, 'id'), req.body?.locale)),
);

aiRoutes.get('/projects/:id/technical-reports', requireAuth, async (req, res) =>
  res.json(await aiService.technicalReports(currentUser(req), param(req, 'id'))),
);

aiRoutes.post('/projects/:id/technical-reports', requireAuth, aiLimiter, validate(technicalReportGenerateSchema), async (req, res) =>
  res.status(201).json(await aiService.generateTechnicalReport(req, currentUser(req), param(req, 'id'), req.body.locale)),
);

aiRoutes.post(
  '/projects/:id/technical-reports/:reportId/share',
  requireAuth,
  validate(technicalReportShareSchema),
  async (req, res) =>
    res.json(await aiService.shareTechnicalReport(req, currentUser(req), param(req, 'id'), param(req, 'reportId'), req.body.userIds)),
);

aiRoutes.delete('/projects/:id/technical-reports/:reportId/share/:userId', requireAuth, async (req, res) =>
  res.json(await aiService.unshareTechnicalReport(req, currentUser(req), param(req, 'id'), param(req, 'reportId'), param(req, 'userId'))),
);

aiRoutes.post('/projects/:id/task-plan', requireAuth, aiLimiter, validate(taskPlanSchema), async (req, res) =>
  res.json(await aiService.taskPlan(currentUser(req), param(req, 'id'), req.body)),
);

// Reports a colleague shared with the signed-in user, and one report by id (manager or recipient).
aiRoutes.get('/technical-reports/shared', requireAuth, async (req, res) => res.json(await aiService.sharedTechnicalReports(currentUser(req))));
aiRoutes.get('/technical-reports/:reportId', requireAuth, async (req, res) =>
  res.json(await aiService.technicalReport(currentUser(req), param(req, 'reportId'))),
);

// ── Super Admin control ─────────────────────────────────────────────────────
aiRoutes.get('/settings', requirePermission('ai.manage'), async (_req, res) => res.json(await aiService.settings()));
aiRoutes.put('/settings', requirePermission('ai.manage'), validate(aiSettingsSchema), async (req, res) =>
  res.json(await aiService.updateSettings(req, currentUser(req), req.body)),
);
aiRoutes.post('/settings/test', requirePermission('ai.manage'), aiLimiter, async (req, res) =>
  res.json(await aiService.test(currentUser(req))),
);
aiRoutes.get('/usage', requirePermission('ai.manage'), async (_req, res) => res.json(await aiService.usage()));
