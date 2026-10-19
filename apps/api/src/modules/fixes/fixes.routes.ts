import { Router } from 'express';
import { fixAnalysisSchema, updateFixRequestSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { aiLimiter, secretLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { aiService } from '../ai/ai.service';
import { fixesService } from './fixes.service';

/** /api/projects/:id/fix — creating one is POST /api/projects/fix (see projects.routes). */
export const projectFixRoutes = Router({ mergeParams: true });
projectFixRoutes.use(requireAuth);

projectFixRoutes.patch('/', validate(updateFixRequestSchema), async (req, res) =>
  res.json(await fixesService.update(req, currentUser(req), param(req, 'id'), req.body)),
);

// POST, not GET: decrypted secrets must never sit in caches, logs or browser history.
projectFixRoutes.post('/credentials', secretLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await fixesService.revealCredentials(req, currentUser(req), param(req, 'id')));
});

projectFixRoutes.delete('/credentials', async (req, res) =>
  res.json(await fixesService.clearCredentials(req, currentUser(req), param(req, 'id'))),
);

projectFixRoutes.post('/analysis', aiLimiter, validate(fixAnalysisSchema), async (req, res) =>
  res.json(await aiService.analyzeFix(req, currentUser(req), param(req, 'id'), req.body.locale)),
);
