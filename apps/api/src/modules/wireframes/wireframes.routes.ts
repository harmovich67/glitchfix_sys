import { Router } from 'express';
import { generateWireframeSchema, respondWireframeSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { wireframesService } from './wireframes.service';

/** /api/projects/:id/wireframes */
export const projectWireframesRoutes = Router({ mergeParams: true });
projectWireframesRoutes.use(requireAuth);

const ids = (req: Parameters<typeof param>[0]) => [currentUser(req), param(req, 'id')] as const;

projectWireframesRoutes.get('/', async (req, res) => res.json(await wireframesService.list(...ids(req))));
projectWireframesRoutes.post('/', aiLimiter, validate(generateWireframeSchema), async (req, res) =>
  res.status(201).json(await wireframesService.create(req, ...ids(req), req.body)),
);
projectWireframesRoutes.post('/:wid/share', async (req, res) => res.json(await wireframesService.share(req, ...ids(req), param(req, 'wid'))));
projectWireframesRoutes.post('/:wid/view', async (req, res) => res.json(await wireframesService.view(...ids(req), param(req, 'wid'))));
projectWireframesRoutes.post('/:wid/withdraw', async (req, res) => res.json(await wireframesService.withdraw(req, ...ids(req), param(req, 'wid'))));
projectWireframesRoutes.post('/:wid/respond', validate(respondWireframeSchema), async (req, res) =>
  res.json(await wireframesService.respond(req, ...ids(req), param(req, 'wid'), req.body)),
);
projectWireframesRoutes.delete('/:wid', async (req, res) => {
  await wireframesService.remove(req, ...ids(req), param(req, 'wid'));
  res.status(204).end();
});
