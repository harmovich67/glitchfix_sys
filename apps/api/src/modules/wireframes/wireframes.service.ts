import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { generateWireframeSchema, respondWireframeSchema, WireframeSpec } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { aiService } from '../ai/ai.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { loadProjectAccess } from '../projects/projects.access';
import { projectsRepository } from '../projects/projects.repository';
import { briefUserSelect } from '../users/users.repository';

const include = { createdBy: { select: briefUserSelect } } satisfies Prisma.WireframeInclude;
type Row = Prisma.WireframeGetPayload<{ include: typeof include }>;

const link = (projectId: string) => `/app/projects/${projectId}?tab=design`;
/** What the client is allowed to see: only versions the team actually shared. */
const clientVisible: Prisma.WireframeWhereInput = { status: { in: ['SHARED', 'APPROVED', 'CHANGES_REQUESTED'] } };
const locales = ['en', 'ar'] as const;
const toLocale = (v: string | undefined | null, fallback: string) => locales.find((l) => l === v) ?? locales.find((l) => l === fallback) ?? 'en';
const LIVE = ['SHARED', 'CHANGES_REQUESTED', 'APPROVED'];

/** Team members work with every version; the client's owner sees the shared ones and never the private notes. */
function serialize(row: Row, audience: 'team' | 'client') {
  const { spec, notes, model, mock, createdBy, ...rest } = row;
  return { ...rest, spec: spec as unknown as WireframeSpec, ...(audience === 'team' ? { notes, model, mock, createdBy } : {}) };
}

async function accessFor(user: AuthUser, projectId: string) {
  const access = await loadProjectAccess(user, projectId);
  if (access.isOwner) return { access, audience: 'client' as const };
  if (access.canWork) return { access, audience: 'team' as const };
  throw notFound('Project');
}
async function managerFor(user: AuthUser, projectId: string) {
  const ctx = await accessFor(user, projectId);
  if (!ctx.access.canManage) throw forbidden();
  return ctx;
}

async function loadOwned(projectId: string, id: string): Promise<Row> {
  const row = await prisma.wireframe.findFirst({ where: { id, projectId }, include });
  if (!row) throw notFound('Wireframe');
  return row;
}

/** The project's people plus the leads: everyone who should hear how the client reacted. */
async function teamOf(projectId: string, exclude?: string) {
  const [members, leads] = await Promise.all([
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
    prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'] }, isActive: true }, select: { id: true } }),
  ]);
  return [...new Set([...members.map((m) => m.userId), ...leads.map((u) => u.id)])].filter((id) => id !== exclude);
}

/** Insert with the next version number, retrying if two people generate at the same moment. */
async function createVersion(data: Omit<Prisma.WireframeUncheckedCreateInput, 'version'>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.wireframe.aggregate({ where: { projectId: data.projectId }, _max: { version: true } });
    try {
      return await prisma.wireframe.create({ data: { ...data, version: (last._max.version ?? 0) + 1 }, include });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new AppError(409, 'CONFLICT', 'Another version was created at the same time. Please try again.');
}

export const wireframesService = {
  async list(user: AuthUser, projectId: string) {
    const ctx = await accessFor(user, projectId);
    const rows: Row[] = await prisma.wireframe.findMany({
      where: { projectId, ...(ctx.audience === 'client' ? clientVisible : {}) },
      orderBy: { version: 'desc' },
      include,
    });
    return {
      canManage: ctx.audience === 'team' && ctx.access.canManage,
      submitted: !!ctx.access.project.submittedAt,
      wireframes: rows.map((r) => serialize(r, ctx.audience)),
    };
  },

  /** The client opened the Design tab: record the first time so the team knows the sketch was seen. */
  async view(user: AuthUser, projectId: string, id: string) {
    const ctx = await accessFor(user, projectId);
    if (ctx.audience !== 'client') return { ok: true };
    const { count } = await prisma.wireframe.updateMany({ where: { id, projectId, status: 'SHARED', viewedAt: null }, data: { viewedAt: new Date() } });
    if (count) {
      await notificationsService.notify(await teamOf(projectId), {
        type: 'wireframe.viewed',
        title: `${ctx.access.project.code} · the client opened the design sketch`,
        link: link(projectId),
      });
      events.emit('project.updated', { projectId });
    }
    return { ok: true };
  },

  async create(req: Request, user: AuthUser, projectId: string, input: z.infer<typeof generateWireframeSchema>) {
    await managerFor(user, projectId);
    if (!(await prisma.answer.count({ where: { projectId } })))
      throw badRequest('The client has not answered any requirements yet, so there is nothing to sketch.');
    const locale = toLocale(input.locale, user.locale);
    const draft = await aiService.draftWireframe(user, projectId, { locale, notes: input.notes });
    const created = await createVersion({
      projectId,
      status: 'DRAFT',
      locale,
      title: draft.spec.title,
      spec: draft.spec as unknown as Prisma.InputJsonValue,
      notes: input.notes || null,
      model: draft.model,
      mock: draft.mock,
      createdById: user.id,
    });
    await projectsRepository.addEvent(projectId, {
      type: 'wireframe',
      title: `Wireframe v${created.version} drafted`,
      actorId: user.id,
      visibility: 'INTERNAL',
      meta: { wireframeId: created.id },
    });
    await auditService.log(req, { action: 'wireframe.created', entityType: 'Wireframe', entityId: created.id, meta: { projectId, version: created.version, mock: draft.mock } });
    events.emit('project.updated', { projectId });
    return serialize(created, 'team');
  },

  /** Publish to the client. Earlier versions still open with the client are superseded so there is one live sketch. */
  async share(req: Request, user: AuthUser, projectId: string, id: string) {
    const { access } = await managerFor(user, projectId);
    const row = await loadOwned(projectId, id);
    if (row.status !== 'DRAFT') throw conflict('Only a draft can be shared. Generate a new version first.');
    const [, shared] = await prisma.$transaction([
      prisma.wireframe.updateMany({ where: { projectId, status: { in: LIVE }, id: { not: row.id } }, data: { status: 'SUPERSEDED' } }),
      prisma.wireframe.update({
        where: { id: row.id },
        data: { status: 'SHARED', sharedAt: new Date(), viewedAt: null, respondedAt: null, responseNote: null },
        include,
      }),
    ]);
    await projectsRepository.addEvent(projectId, {
      type: 'wireframe',
      title: `Design sketch v${shared.version} shared for your review`,
      actorId: user.id,
      visibility: 'CLIENT',
      meta: { wireframeId: shared.id },
    });
    await notificationsService.notify([access.project.clientId], {
      type: 'wireframe.shared',
      title: `A first design sketch is ready · ${access.project.code}`,
      body: `Take a look at the initial layout for “${access.project.title}” and tell us if it is the right direction.`,
      link: link(projectId),
      email: true,
    });
    await auditService.log(req, { action: 'wireframe.shared', entityType: 'Wireframe', entityId: shared.id, meta: { projectId, version: shared.version } });
    events.emit('project.updated', { projectId });
    return serialize(shared, 'team');
  },

  /** Pull a shared sketch back; the client stops seeing it. */
  async withdraw(req: Request, user: AuthUser, projectId: string, id: string) {
    await managerFor(user, projectId);
    const row = await loadOwned(projectId, id);
    if (!LIVE.includes(row.status)) throw conflict('Only a shared sketch can be withdrawn.');
    const updated = await prisma.wireframe.update({ where: { id: row.id }, data: { status: 'WITHDRAWN' }, include });
    await projectsRepository.addEvent(projectId, { type: 'wireframe', title: `Design sketch v${row.version} withdrawn`, actorId: user.id, visibility: 'INTERNAL' });
    await auditService.log(req, { action: 'wireframe.withdrawn', entityType: 'Wireframe', entityId: row.id, meta: { projectId } });
    events.emit('project.updated', { projectId });
    return serialize(updated, 'team');
  },

  async remove(req: Request, user: AuthUser, projectId: string, id: string) {
    await managerFor(user, projectId);
    const row = await loadOwned(projectId, id);
    if (LIVE.includes(row.status)) throw conflict('Withdraw this sketch before deleting it.');
    await prisma.wireframe.delete({ where: { id: row.id } });
    await auditService.log(req, { action: 'wireframe.deleted', entityType: 'Wireframe', entityId: row.id, meta: { projectId, version: row.version } });
    events.emit('project.updated', { projectId });
  },

  /** The client says it looks right, or asks for changes with a note the team can act on. */
  async respond(req: Request, user: AuthUser, projectId: string, id: string, input: z.infer<typeof respondWireframeSchema>) {
    const ctx = await accessFor(user, projectId);
    if (ctx.audience !== 'client') throw forbidden('Only the client can respond to a design sketch.');
    const row = await loadOwned(projectId, id);
    if (row.status !== 'SHARED') throw conflict('This sketch is no longer open for a response.');
    const approve = input.action === 'APPROVE';
    const updated = await prisma.wireframe.update({
      where: { id: row.id },
      data: { status: approve ? 'APPROVED' : 'CHANGES_REQUESTED', respondedAt: new Date(), responseNote: input.note || null },
      include,
    });
    const project = ctx.access.project;
    await projectsRepository.addEvent(projectId, {
      type: 'wireframe',
      title: approve ? `Design sketch v${row.version} approved` : `Changes requested on design sketch v${row.version}`,
      body: input.note || null,
      actorId: user.id,
      visibility: 'CLIENT',
      meta: { wireframeId: row.id },
    });
    await notificationsService.notify(await teamOf(projectId, user.id), {
      type: approve ? 'wireframe.approved' : 'wireframe.changes',
      title: approve ? `Design sketch approved · ${project.code}` : `Changes requested on the sketch · ${project.code}`,
      body: (input.note || '').slice(0, 200),
      link: link(projectId),
      email: true,
    });
    await auditService.log(req, { action: approve ? 'wireframe.approved' : 'wireframe.changes_requested', entityType: 'Wireframe', entityId: row.id, meta: { projectId } });
    events.emit('project.updated', { projectId });
    return serialize(updated, 'client');
  },
};
