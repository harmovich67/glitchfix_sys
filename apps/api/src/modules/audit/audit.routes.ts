import { Router } from 'express';
import { requirePermission } from '../../middleware/auth';
import { auditService } from './audit.service';

export const auditRoutes = Router();

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

auditRoutes.get('/', requirePermission('audit.view'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 30));
  res.json(
    await auditService.list({
      page,
      pageSize,
      action: str(req.query.action),
      entityType: str(req.query.entityType),
      actorId: str(req.query.actorId),
    }),
  );
});
