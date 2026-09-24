import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { uploadLimiter } from '../../middleware/rateLimit';
import { currentUser, param } from '../../core/http';
import { filesService, upload } from './files.service';

export const projectFilesRoutes = Router({ mergeParams: true });
export const filesRoutes = Router();

projectFilesRoutes.use(requireAuth);

projectFilesRoutes.get('/', async (req, res) => {
  res.json(await filesService.list(currentUser(req), param(req, 'id')));
});

// Access is checked *before* multer writes anything to disk.
projectFilesRoutes.post(
  '/',
  uploadLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    res.locals.access = await filesService.uploadAccess(currentUser(req), param(req, 'id'));
    next();
  },
  upload.array('files', 10),
  async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    res.status(201).json(await filesService.saveUploads(req, currentUser(req), res.locals.access, files));
  },
);

filesRoutes.use(requireAuth);

filesRoutes.get('/:id/download', async (req, res) => {
  const { file, abs, inline } = await filesService.resolveDownload(currentUser(req), param(req, 'id'));
  const wantsInline = inline && req.query.inline === '1';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Browsers' built-in PDF viewer does not run inside a CSP sandbox, so an inline PDF gets a sandbox-free policy
  // (it is still same-origin-framed only and cannot load anything).
  const inlinePdf = wantsInline && file.mimeType === 'application/pdf';
  res.setHeader(
    'Content-Security-Policy',
    inlinePdf ? "default-src 'none'; frame-ancestors 'self'" : "default-src 'none'; img-src 'self'; sandbox",
  );
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `${wantsInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
  );
  res.sendFile(abs);
});

filesRoutes.delete('/:id', async (req, res) => {
  await filesService.remove(req, currentUser(req), param(req, 'id'));
  res.status(204).end();
});
