import { Router } from 'express';
import { createWorkflowSchema, saveWorkflowSchema } from '@welco/shared';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { param } from '../../core/http';
import { workflowsService } from './workflows.service';

export const workflowsRoutes = Router();

workflowsRoutes.use(requirePermission('workflows.manage'));

workflowsRoutes.get('/', async (_req, res) => res.json(await workflowsService.list()));
workflowsRoutes.get('/:id', async (req, res) => res.json(await workflowsService.get(param(req, 'id'))));
workflowsRoutes.post('/', validate(createWorkflowSchema), async (req, res) =>
  res.status(201).json(await workflowsService.create(req, req.body)),
);
workflowsRoutes.post('/:id/duplicate', async (req, res) =>
  res.status(201).json(await workflowsService.duplicate(req, param(req, 'id'))),
);
workflowsRoutes.put('/:id', validate(saveWorkflowSchema), async (req, res) =>
  res.json(await workflowsService.save(req, param(req, 'id'), req.body)),
);
workflowsRoutes.post('/:id/default', async (req, res) => res.json(await workflowsService.setDefault(req, param(req, 'id'))));
workflowsRoutes.delete('/:id', async (req, res) => {
  await workflowsService.remove(req, param(req, 'id'));
  res.status(204).end();
});
