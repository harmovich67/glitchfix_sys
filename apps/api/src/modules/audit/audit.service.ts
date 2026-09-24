import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';
import { requestMeta } from '../../core/http';

export interface AuditEntry {
  action: string; // e.g. "project.status_changed"
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

export const auditService = {
  async log(req: Request | null, entry: AuditEntry, actorId?: string | null) {
    const meta = req ? requestMeta(req) : { ip: null, userAgent: null };
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? req?.user?.id ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        meta: (entry.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  },

  async list(params: { page: number; pageSize: number; action?: string; entityType?: string; actorId?: string }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.action ? { action: { contains: params.action } } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.actorId ? { actorId: params.actorId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  },
};
