import { Router } from 'express';
import { platformSettingsSchema } from '@welco/shared';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditService } from '../audit/audit.service';
import { demoLogins } from './demo-logins';
import { settingsService } from './settings.service';

export const settingsRoutes = Router();

// Public settings accessible without authentication for landing page footer & visitor info
settingsRoutes.get('/public', async (_req, res) => {
  const s = await settingsService.get();
  res.json({
    // One-click sign-in buttons for demo accounts that still exist with the demo password.
    demoAccounts: await demoLogins(),
    allowClientRegistration: s.allowClientRegistration,
    contact: s.contact,
    brand: s.brand,
    seo: s.seo,
  });
});

settingsRoutes.get('/', requireAuth, async (_req, res) => {
  res.json(await settingsService.get());
});

settingsRoutes.put('/', requirePermission('settings.manage'), validate(platformSettingsSchema), async (req, res) => {
  const before = await settingsService.get();
  const after = await settingsService.update(req.body);
  await auditService.log(req, { action: 'settings.updated', entityType: 'Setting', entityId: 'platform', meta: { before, after } });
  res.json(after);
});
