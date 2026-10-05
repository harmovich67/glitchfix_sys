import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { UPLOAD_LIMITS, uploadMetaSchema, type AnswerMap } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { loadProjectAccess, type ProjectAccess } from '../projects/projects.access';
import { briefUserSelect } from '../users/users.repository';

// Serverless hosts (Vercel) have a read-only filesystem except the OS temp dir, so uploads live there (ephemeral).
export const STORAGE_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'storage') : path.resolve(process.cwd(), 'storage');
try {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
} catch (err) {
  console.error('Could not create storage dir:', err);
}

const INLINE_SAFE = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);

export const upload = multer({
  storage: multer.diskStorage({
    destination: STORAGE_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: UPLOAD_LIMITS.maxBytes, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = (UPLOAD_LIMITS.extensions as readonly string[]).includes(ext);
    const okMime = (UPLOAD_LIMITS.mime as readonly string[]).includes(file.mimetype);
    if (!okExt || !okMime) return cb(badRequest(`File type not allowed: ${file.originalname}`));
    cb(null, true);
  },
});

const fileSelect = {
  id: true,
  projectId: true,
  questionKey: true,
  category: true,
  visibility: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploader: { select: briefUserSelect },
} satisfies Prisma.FileSelect;

function safeName(name: string) {
  // Filenames arrive latin1-encoded from multipart; recover UTF-8 (Arabic names etc.)
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.replace(/[\\/\r\n"]/g, '_').slice(0, 200);
}

export const filesService = {
  async uploadAccess(user: AuthUser, projectId: string) {
    return loadProjectAccess(user, projectId);
  },

  async saveUploads(req: Request, user: AuthUser, access: ProjectAccess, files: Express.Multer.File[]) {
    const cleanup = () => files.forEach((f) => fs.rm(f.path, { force: true }, () => {}));
    const meta = uploadMetaSchema.safeParse(req.body ?? {});
    if (!meta.success) {
      cleanup();
      throw badRequest('Invalid upload metadata', meta.error.flatten());
    }
    if (!files.length) throw badRequest('No files received');
    const { category, visibility, questionKey } = meta.data;
    if (access.isClient && (visibility === 'INTERNAL' || category === 'PREVIEW')) {
      cleanup();
      throw forbidden('Clients can only upload shared files');
    }
    if (!access.isClient && !access.canWork) {
      cleanup();
      throw forbidden();
    }

    const created = await prisma.$transaction(
      files.map((f) =>
        prisma.file.create({
          data: {
            projectId: access.project.id,
            uploaderId: user.id,
            questionKey: questionKey ?? null,
            category,
            visibility,
            originalName: safeName(f.originalname),
            mimeType: f.mimetype,
            size: f.size,
            storageKey: path.basename(f.path),
          },
          select: fileSelect,
        }),
      ),
    );

    for (const f of created) {
      events.emit('file.uploaded', { fileId: f.id, projectId: access.project.id, actorId: user.id, visibility, category });
    }
    if (category === 'PREVIEW') {
      await prisma.projectEvent.create({
        data: {
          projectId: access.project.id,
          actorId: user.id,
          type: 'preview',
          title: `New preview shared: ${created[0].originalName}`,
          visibility: 'CLIENT',
        },
      });
    }
    await auditService.log(req, {
      action: 'file.uploaded',
      entityType: 'Project',
      entityId: access.project.id,
      meta: { files: created.map((f) => f.originalName), category, visibility },
    });
    return created;
  },

  async list(user: AuthUser, projectId: string) {
    const access = await loadProjectAccess(user, projectId);
    return prisma.file.findMany({
      where: { projectId, ...(access.isClient ? { visibility: 'CLIENT' } : {}) },
      orderBy: { createdAt: 'desc' },
      select: fileSelect,
    });
  },

  async resolveDownload(user: AuthUser, id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || !file.projectId) throw notFound('File');
    const access = await loadProjectAccess(user, file.projectId);
    if (access.isClient && file.visibility !== 'CLIENT') throw notFound('File');
    const abs = path.join(STORAGE_DIR, path.basename(file.storageKey));
    if (!abs.startsWith(STORAGE_DIR) || !fs.existsSync(abs)) throw notFound('File');
    return { file, abs, inline: INLINE_SAFE.has(file.mimeType) };
  },

  async remove(req: Request, user: AuthUser, id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || !file.projectId) throw notFound('File');
    const access = await loadProjectAccess(user, file.projectId);
    if (file.uploaderId !== user.id && !access.canManage) throw forbidden();
    if (access.isClient && access.project.approvedAt && file.questionKey)
      throw forbidden('Requirements are locked; ask the team to remove this file');

    await prisma.file.delete({ where: { id } });
    fs.rm(path.join(STORAGE_DIR, path.basename(file.storageKey)), { force: true }, () => {});

    if (file.questionKey) {
      // Keep the answer consistent: drop the removed file id.
      const answer = await prisma.answer.findUnique({
        where: { projectId_questionKey: { projectId: file.projectId, questionKey: file.questionKey } },
      });
      const value = answer?.value as AnswerMap[string];
      if (answer && Array.isArray(value)) {
        const next = value.filter((v) => v !== id);
        await prisma.answer.update({ where: { id: answer.id }, data: { value: next as Prisma.InputJsonValue } });
      }
    }
    await auditService.log(req, { action: 'file.deleted', entityType: 'File', entityId: id, meta: { name: file.originalName } });
  },
};
