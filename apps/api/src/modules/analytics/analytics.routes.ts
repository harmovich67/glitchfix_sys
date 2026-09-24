import { Router } from 'express';
import { requirePermission } from '../../middleware/auth';
import { analyticsService } from './analytics.service';

export const analyticsRoutes = Router();

analyticsRoutes.get('/overview', requirePermission('analytics.view'), async (req, res) => {
  const range = [7, 30, 90, 365].includes(Number(req.query.range)) ? Number(req.query.range) : 90;
  res.json(await analyticsService.overview(range));
});
