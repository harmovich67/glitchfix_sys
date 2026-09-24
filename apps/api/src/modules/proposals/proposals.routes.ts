import { Router } from 'express';
import { acceptProposalSchema, createProposalSchema, regenerateProposalSchema, respondProposalSchema, updateProposalSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { proposalsService } from './proposals.service';

/** /api/projects/:id/proposals */
export const projectProposalsRoutes = Router({ mergeParams: true });
projectProposalsRoutes.use(requireAuth);

const ids = (req: Parameters<typeof param>[0]) => [currentUser(req), param(req, 'id')] as const;

projectProposalsRoutes.get('/', async (req, res) => res.json(await proposalsService.list(...ids(req))));
projectProposalsRoutes.post('/', aiLimiter, validate(createProposalSchema), async (req, res) =>
  res.status(201).json(await proposalsService.create(req, ...ids(req), req.body)),
);
projectProposalsRoutes.get('/:pid', async (req, res) => res.json(await proposalsService.get(...ids(req), param(req, 'pid'))));
projectProposalsRoutes.patch('/:pid', validate(updateProposalSchema), async (req, res) =>
  res.json(await proposalsService.update(req, ...ids(req), param(req, 'pid'), req.body)),
);
projectProposalsRoutes.post('/:pid/regenerate', aiLimiter, validate(regenerateProposalSchema), async (req, res) =>
  res.json(await proposalsService.regenerate(req, ...ids(req), param(req, 'pid'), req.body)),
);
projectProposalsRoutes.post('/:pid/send', async (req, res) => res.json(await proposalsService.send(req, ...ids(req), param(req, 'pid'))));
projectProposalsRoutes.post('/:pid/withdraw', async (req, res) => res.json(await proposalsService.withdraw(req, ...ids(req), param(req, 'pid'))));
projectProposalsRoutes.post('/:pid/revise', async (req, res) => res.status(201).json(await proposalsService.revise(req, ...ids(req), param(req, 'pid'))));
projectProposalsRoutes.post('/:pid/accept', validate(acceptProposalSchema), async (req, res) =>
  res.json(await proposalsService.accept(req, ...ids(req), param(req, 'pid'), req.body)),
);
projectProposalsRoutes.post('/:pid/respond', validate(respondProposalSchema), async (req, res) =>
  res.json(await proposalsService.respond(req, ...ids(req), param(req, 'pid'), req.body)),
);

/** /api/proposals */
export const proposalsRoutes = Router();
proposalsRoutes.use(requireAuth);
proposalsRoutes.get('/pending', async (req, res) => res.json(await proposalsService.pending(currentUser(req))));
