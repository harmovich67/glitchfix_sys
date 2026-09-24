import { Router } from 'express';
import { assignTimeOffSchema, createTimeOffSchema, decideTimeOffSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { timeOffService } from './timeoff.service';

export const timeOffRoutes = Router();
timeOffRoutes.use(requireAuth);

timeOffRoutes.get('/summary', async (req, res) => res.json(await timeOffService.summary(currentUser(req))));
timeOffRoutes.get('/mine', async (req, res) => res.json(await timeOffService.mine(currentUser(req))));
timeOffRoutes.get('/away', async (req, res) => res.json(await timeOffService.away(currentUser(req))));
timeOffRoutes.get('/review', async (req, res) =>
  res.json(await timeOffService.review(currentUser(req), typeof req.query.status === 'string' ? req.query.status : undefined)),
);
timeOffRoutes.post('/', validate(createTimeOffSchema), async (req, res) =>
  res.status(201).json(await timeOffService.create(req, currentUser(req), req.body)),
);
timeOffRoutes.post('/:id/cancel', async (req, res) => res.json(await timeOffService.cancel(req, currentUser(req), param(req, 'id'))));
timeOffRoutes.post('/:id/assign', validate(assignTimeOffSchema), async (req, res) =>
  res.json(await timeOffService.assign(req, currentUser(req), param(req, 'id'), req.body)),
);
timeOffRoutes.post('/:id/decision', validate(decideTimeOffSchema), async (req, res) =>
  res.json(await timeOffService.decide(req, currentUser(req), param(req, 'id'), req.body)),
);
