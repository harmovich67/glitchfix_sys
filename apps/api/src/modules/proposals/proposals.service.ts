import type { Request } from 'express';
import { Prisma, type Proposal } from '@prisma/client';
import type { z } from 'zod';
import {
  hasFinanceAccess,
  proposalTotals,
  type PaymentMilestone,
  type ProjectStatus,
  type acceptProposalSchema,
  type createProposalSchema,
  type regenerateProposalSchema,
  type respondProposalSchema,
  type updateProposalSchema,
} from '@welco/shared';
import { prisma } from '../../core/prisma';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../core/errors';
import { events } from '../../core/events';
import type { AuthUser } from '../../types/express';
import { aiService } from '../ai/ai.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { loadProjectAccess } from '../projects/projects.access';
import { projectsRepository } from '../projects/projects.repository';
import { STATUS_LABELS } from '../projects/projects.service';
import { settingsService } from '../settings/settings.service';
import { briefUserSelect } from '../users/users.repository';

const include = { createdBy: { select: briefUserSelect } } satisfies Prisma.ProposalInclude;
type Row = Prisma.ProposalGetPayload<{ include: typeof include }>;

/** Statuses a project can still be in when the client's approval should start the work. */
const PRE_START: ProjectStatus[] = ['STARTED', 'REQUIREMENTS', 'UNDER_REVIEW'];
const DAY = 24 * 3600 * 1000;
const link = (projectId: string) => `/app/projects/${projectId}?tab=proposal`;

const paymentsOf = (p: Pick<Proposal, 'payments'>) => (Array.isArray(p.payments) ? (p.payments as unknown as PaymentMilestone[]) : []);

/** One shape for both audiences. The client never sees the sender's private notes, the AI model or who drafted it. */
function serialize(p: Row, audience: 'manager' | 'client', withContent: boolean) {
  const payments = paymentsOf(p);
  const { content, notes, model, mock, createdBy, payments: _raw, ...rest } = p;
  return {
    ...rest,
    payments,
    totals: proposalTotals(p.amount, p.taxPercent, payments),
    expired: p.status === 'SENT' && !!p.validUntil && p.validUntil.getTime() < Date.now(),
    ...(withContent ? { content } : {}),
    ...(audience === 'manager' ? { notes, model, mock, createdBy } : {}),
  };
}

/**
 * Offers carry the price, so on the team side only people cleared for finances (the Super Admin, and whoever they
 * granted it to) work with them, and they see every version. The client's owner sees only what was sent to them.
 */
async function accessFor(user: AuthUser, projectId: string) {
  const access = await loadProjectAccess(user, projectId);
  if (access.canManage) {
    if (!access.canViewFinance) throw forbidden('Offers and prices are only visible to people cleared for finances');
    return { access, audience: 'manager' as const };
  }
  if (access.isOwner) return { access, audience: 'client' as const };
  throw notFound('Project');
}
const assertManager = (a: { audience: 'manager' | 'client' }) => {
  if (a.audience !== 'manager') throw forbidden();
};
const clientVisible: Prisma.ProposalWhereInput = { status: { notIn: ['DRAFT', 'WITHDRAWN'] } };

async function loadOwned(projectId: string, proposalId: string) {
  const row = await prisma.proposal.findFirst({ where: { id: proposalId, projectId }, include });
  if (!row) throw notFound('Proposal');
  return row;
}

/** Everyone who should hear that the client responded: only the people who are allowed to see offers. */
async function teamOf(_projectId: string, exclude?: string) {
  const people = await prisma.user.findMany({
    where: { isActive: true, OR: [{ role: 'SUPER_ADMIN' }, { financeAccess: true, role: { in: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] } }] },
    select: { id: true },
  });
  return people.map((u) => u.id).filter((id) => id !== exclude);
}

async function nextVersion(projectId: string) {
  return ((await prisma.proposal.aggregate({ where: { projectId }, _max: { version: true } }))._max.version ?? 0) + 1;
}

/** Insert with the next version number, retrying if two managers create one at the same moment. */
async function createVersion(data: Omit<Prisma.ProposalUncheckedCreateInput, 'version'>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.proposal.create({ data: { ...data, version: await nextVersion(data.projectId) }, include });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new AppError(409, 'CONFLICT', 'Another version was created at the same time. Please try again.');
}

const locales = ['en', 'ar'] as const;
const toLocale = (v: string | undefined | null, fallback: string) => (locales.find((l) => l === v) ?? (locales.find((l) => l === fallback) ?? 'en'));

export const proposalsService = {
  async list(user: AuthUser, projectId: string) {
    const ctx = await accessFor(user, projectId);
    const rows = await prisma.proposal.findMany({
      where: { projectId, ...(ctx.audience === 'client' ? clientVisible : {}) },
      orderBy: { version: 'desc' },
      include,
      omit: { content: true },
    });
    const settings = ctx.audience === 'manager' ? (await settingsService.get()).proposal : null;
    return {
      canManage: ctx.audience === 'manager',
      submitted: !!ctx.access.project.submittedAt,
      hasAccepted: rows.some((r) => r.status === 'ACCEPTED'),
      defaults: settings && { currency: settings.defaultCurrency, validDays: settings.defaultValidDays, taxPercent: settings.defaultTaxPercent },
      proposals: rows.map((r) => serialize({ ...r, content: '' }, ctx.audience, false)),
    };
  },

  /** One proposal with its text. The client opening a sent proposal for the first time is recorded (and the team told). */
  async get(user: AuthUser, projectId: string, proposalId: string) {
    const ctx = await accessFor(user, projectId);
    let row = await loadOwned(projectId, proposalId);
    if (ctx.audience === 'client') {
      if (row.status === 'DRAFT' || row.status === 'WITHDRAWN') throw notFound('Proposal');
      if (row.status === 'SENT' && !row.viewedAt) {
        row = await prisma.proposal.update({ where: { id: row.id }, data: { viewedAt: new Date() }, include });
        await notificationsService.notify(await teamOf(projectId), {
          type: 'proposal.viewed',
          title: `${ctx.access.project.code} · the client opened proposal v${row.version}`,
          link: link(projectId),
        });
        events.emit('project.updated', { projectId });
      }
    }
    return { ...serialize(row, ctx.audience, true), project: { id: ctx.access.project.id, code: ctx.access.project.code, title: ctx.access.project.title } };
  },

  async create(req: Request, user: AuthUser, projectId: string, input: z.infer<typeof createProposalSchema>) {
    const ctx = await accessFor(user, projectId);
    assertManager(ctx);
    if (!ctx.access.project.submittedAt) throw badRequest('The client has not submitted the requirements yet, so there is nothing to quote.');
    if (await prisma.proposal.findFirst({ where: { projectId, status: 'ACCEPTED' }, select: { id: true } })) throw conflict('The client already accepted a proposal for this project.');

    const locale = toLocale(input.locale, user.locale);
    const settings = await settingsService.get();
    const draft = await aiService.draftProposal(user, projectId, { locale, durationWeeks: input.durationWeeks ?? null, notes: input.notes });
    const created = await createVersion({
      projectId,
      status: 'DRAFT',
      locale,
      title: input.title?.trim() || (locale === 'ar' ? `عرض ${ctx.access.project.title}` : `Proposal for ${ctx.access.project.title}`),
      currency: input.currency,
      amount: input.amount,
      taxPercent: input.taxPercent,
      durationWeeks: input.durationWeeks ?? null,
      validDays: input.validDays,
      payments: input.payments as unknown as Prisma.InputJsonValue,
      content: draft.content,
      terms: locale === 'ar' ? settings.proposal.termsAr : settings.proposal.termsEn,
      notes: input.notes ?? null,
      model: draft.model,
      mock: draft.mock,
      createdById: user.id,
    });
    await projectsRepository.addEvent(projectId, { type: 'proposal', title: `Proposal v${created.version} drafted`, actorId: user.id, visibility: 'INTERNAL', meta: { proposalId: created.id } });
    await auditService.log(req, { action: 'proposal.created', entityType: 'Proposal', entityId: created.id, meta: { projectId, version: created.version } });
    return { ...serialize(created, 'manager', true), project: { id: projectId, code: ctx.access.project.code, title: ctx.access.project.title } };
  },

  async update(req: Request, user: AuthUser, projectId: string, proposalId: string, input: z.infer<typeof updateProposalSchema>) {
    assertManager(await accessFor(user, projectId));
    const row = await loadOwned(projectId, proposalId);
    if (row.status !== 'DRAFT') throw conflict('A proposal that was sent cannot be edited. Create a revision instead.');
    const updated = await prisma.proposal.update({
      where: { id: row.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.taxPercent !== undefined ? { taxPercent: input.taxPercent } : {}),
        ...(input.durationWeeks !== undefined ? { durationWeeks: input.durationWeeks } : {}),
        ...(input.validDays !== undefined ? { validDays: input.validDays } : {}),
        ...(input.payments !== undefined ? { payments: input.payments as unknown as Prisma.InputJsonValue } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.terms !== undefined ? { terms: input.terms } : {}),
      },
      include,
    });
    await auditService.log(req, { action: 'proposal.updated', entityType: 'Proposal', entityId: row.id, meta: { projectId } });
    return serialize(updated, 'manager', true);
  },

  /** Ask the AI to write the text again (same price and terms), optionally with new guidance. */
  async regenerate(req: Request, user: AuthUser, projectId: string, proposalId: string, input: z.infer<typeof regenerateProposalSchema>) {
    assertManager(await accessFor(user, projectId));
    const row = await loadOwned(projectId, proposalId);
    if (row.status !== 'DRAFT') throw conflict('Only a draft can be rewritten.');
    const locale = toLocale(input.locale, row.locale);
    const notes = input.notes === undefined ? row.notes : input.notes || null;
    const draft = await aiService.draftProposal(user, projectId, { locale, durationWeeks: row.durationWeeks, notes });
    const settings = (await settingsService.get()).proposal;
    const updated = await prisma.proposal.update({
      where: { id: row.id },
      data: {
        content: draft.content,
        model: draft.model,
        mock: draft.mock,
        notes,
        locale,
        // Switching language brings the standard terms of that language, unless the manager changed them by hand.
        ...(locale !== row.locale && [settings.termsEn, settings.termsAr, ''].includes(row.terms) ? { terms: locale === 'ar' ? settings.termsAr : settings.termsEn } : {}),
      },
      include,
    });
    await auditService.log(req, { action: 'proposal.regenerated', entityType: 'Proposal', entityId: row.id, meta: { projectId } });
    return serialize(updated, 'manager', true);
  },

  /** Publish to the client's dashboard. Earlier sent versions are superseded so there is only ever one live offer. */
  async send(req: Request, user: AuthUser, projectId: string, proposalId: string) {
    const ctx = await accessFor(user, projectId);
    assertManager(ctx);
    const row = await loadOwned(projectId, proposalId);
    if (row.status !== 'DRAFT') throw conflict('This proposal was already sent.');
    if (row.content.trim().length < 20) throw badRequest('Write the proposal text before sending it.');
    if (!(row.amount > 0)) throw badRequest('Set the price before sending.');
    const now = new Date();
    const [, sent] = await prisma.$transaction([
      prisma.proposal.updateMany({ where: { projectId, status: { in: ['SENT', 'REVISION_REQUESTED', 'DECLINED'] }, id: { not: row.id } }, data: { status: 'SUPERSEDED' } }),
      prisma.proposal.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: now, validUntil: new Date(now.getTime() + row.validDays * DAY), viewedAt: null, respondedAt: null, responseNote: null }, include }),
    ]);
    await projectsRepository.addEvent(projectId, { type: 'proposal', title: `Proposal v${sent.version} sent for your review`, actorId: user.id, visibility: 'CLIENT', meta: { proposalId: sent.id } });
    await notificationsService.notify([ctx.access.project.clientId], {
      type: 'proposal.sent',
      title: `Your proposal is ready · ${ctx.access.project.code}`,
      body: `Review the offer for “${ctx.access.project.title}” and approve it to get started.`,
      link: link(projectId),
      email: true,
    });
    await auditService.log(req, { action: 'proposal.sent', entityType: 'Proposal', entityId: sent.id, meta: { projectId, version: sent.version } });
    events.emit('project.updated', { projectId });
    return serialize(sent, 'manager', true);
  },

  /** Pull an offer back (e.g. wrong price). The client stops seeing it. */
  async withdraw(req: Request, user: AuthUser, projectId: string, proposalId: string) {
    assertManager(await accessFor(user, projectId));
    const row = await loadOwned(projectId, proposalId);
    if (!['SENT', 'REVISION_REQUESTED', 'DECLINED'].includes(row.status)) throw conflict('Only an open proposal can be withdrawn.');
    const updated = await prisma.proposal.update({ where: { id: row.id }, data: { status: 'WITHDRAWN' }, include });
    await projectsRepository.addEvent(projectId, { type: 'proposal', title: `Proposal v${row.version} withdrawn`, actorId: user.id, visibility: 'INTERNAL' });
    await auditService.log(req, { action: 'proposal.withdrawn', entityType: 'Proposal', entityId: row.id, meta: { projectId } });
    events.emit('project.updated', { projectId });
    return serialize(updated, 'manager', true);
  },

  /** Start a new draft from an earlier version — the usual next step after the client asks for changes. */
  async revise(req: Request, user: AuthUser, projectId: string, proposalId: string) {
    const ctx = await accessFor(user, projectId);
    assertManager(ctx);
    const row = await loadOwned(projectId, proposalId);
    if (row.status === 'ACCEPTED') throw conflict('This proposal was accepted; it cannot be revised.');
    if (row.status === 'DRAFT') throw conflict('This is already a draft.');
    const created = await createVersion({
      projectId,
      status: 'DRAFT',
      locale: row.locale,
      title: row.title,
      currency: row.currency,
      amount: row.amount,
      taxPercent: row.taxPercent,
      durationWeeks: row.durationWeeks,
      validDays: row.validDays,
      payments: row.payments as Prisma.InputJsonValue,
      content: row.content,
      terms: row.terms,
      notes: row.notes,
      model: row.model,
      mock: row.mock,
      createdById: user.id,
    });
    await auditService.log(req, { action: 'proposal.revised', entityType: 'Proposal', entityId: created.id, meta: { projectId, from: row.version } });
    return { ...serialize(created, 'manager', true), project: { id: projectId, code: ctx.access.project.code, title: ctx.access.project.title } };
  },

  /** The client approves: their typed name is the signature, and the project starts. */
  async accept(req: Request, user: AuthUser, projectId: string, proposalId: string, input: z.infer<typeof acceptProposalSchema>) {
    const ctx = await accessFor(user, projectId);
    if (ctx.audience !== 'client') throw forbidden('Only the client can approve a proposal.');
    const row = await loadOwned(projectId, proposalId);
    if (row.status !== 'SENT') throw conflict(row.status === 'ACCEPTED' ? 'You already approved this proposal.' : 'This proposal is no longer open for approval.');
    if (row.validUntil && row.validUntil.getTime() < Date.now()) throw conflict('This proposal has expired. Please ask us for an updated one.');

    const project = ctx.access.project;
    const now = new Date();
    const startNow = PRE_START.includes(project.status as ProjectStatus);
    const [accepted] = await prisma.$transaction([
      prisma.proposal.update({ where: { id: row.id }, data: { status: 'ACCEPTED', respondedAt: now, acceptedByName: input.signerName, responseNote: null }, include }),
      // What the client approved is the scope: lock the requirements and start the work.
      prisma.project.update({
        where: { id: projectId },
        data: { approvedAt: project.approvedAt ?? now, startDate: project.startDate ?? now, ...(startNow ? { status: 'DESIGN' } : {}) },
      }),
    ]);
    await projectsRepository.addEvent(projectId, { type: 'proposal', title: `Proposal v${row.version} approved by ${input.signerName}`, actorId: user.id, visibility: 'CLIENT', meta: { proposalId: row.id } });
    if (startNow) {
      await projectsRepository.addEvent(projectId, { type: 'status', title: `Moved to ${STATUS_LABELS.DESIGN}`, actorId: user.id, meta: { from: project.status, to: 'DESIGN' } });
      events.emit('project.statusChanged', { projectId, actorId: user.id, from: project.status as ProjectStatus, to: 'DESIGN' });
    }
    await notificationsService.notify(await teamOf(projectId, user.id), {
      type: 'proposal.accepted',
      title: `Proposal approved · ${project.code}`,
      body: `${input.signerName} approved “${project.title}”. ${startNow ? 'The project moved to the design phase.' : 'The project can start.'}`,
      link: `/app/projects/${projectId}`,
      email: true,
    });
    await auditService.log(req, { action: 'proposal.accepted', entityType: 'Proposal', entityId: row.id, meta: { projectId, version: row.version, signedAs: input.signerName, amount: row.amount, currency: row.currency } });
    events.emit('project.updated', { projectId });
    return serialize(accepted, 'client', true);
  },

  /** The client declines, or asks for changes with a note the team can act on. */
  async respond(req: Request, user: AuthUser, projectId: string, proposalId: string, input: z.infer<typeof respondProposalSchema>) {
    const ctx = await accessFor(user, projectId);
    if (ctx.audience !== 'client') throw forbidden();
    const row = await loadOwned(projectId, proposalId);
    if (row.status !== 'SENT') throw conflict('This proposal is no longer open.');
    const changes = input.action === 'REQUEST_CHANGES';
    const updated = await prisma.proposal.update({
      where: { id: row.id },
      data: { status: changes ? 'REVISION_REQUESTED' : 'DECLINED', respondedAt: new Date(), responseNote: input.note || null },
      include,
    });
    const project = ctx.access.project;
    await projectsRepository.addEvent(projectId, { type: 'proposal', title: changes ? `Changes requested on proposal v${row.version}` : `Proposal v${row.version} declined`, body: input.note || null, actorId: user.id, visibility: 'CLIENT', meta: { proposalId: row.id } });
    await notificationsService.notify(await teamOf(projectId, user.id), {
      type: changes ? 'proposal.changes' : 'proposal.declined',
      title: changes ? `Changes requested · ${project.code}` : `Proposal declined · ${project.code}`,
      body: (input.note || (changes ? '' : 'No reason given.')).slice(0, 200),
      link: link(projectId),
      email: true,
    });
    await auditService.log(req, { action: changes ? 'proposal.changes_requested' : 'proposal.declined', entityType: 'Proposal', entityId: row.id, meta: { projectId } });
    events.emit('project.updated', { projectId });
    return serialize(updated, 'client', true);
  },

  /**
   * Dashboard feed. Client → offers waiting for their approval. Managers → offers out with the client, ones that need
   * a reply (changes requested / declined) and recent approvals.
   */
  async pending(user: AuthUser) {
    const project = { select: { id: true, code: true, title: true } };
    if (user.role === 'CLIENT') {
      const rows = await prisma.proposal.findMany({
        where: { status: 'SENT', project: { clientId: user.id } },
        orderBy: { sentAt: 'desc' },
        include: { project },
        omit: { content: true },
      });
      return { audience: 'client' as const, items: rows.map((r) => ({ ...serialize({ ...r, content: '', createdBy: null } as unknown as Row, 'client', false), project: r.project })) };
    }
    if (!hasFinanceAccess(user)) return { audience: 'none' as const, items: [] };
    const since = new Date(Date.now() - 14 * DAY);
    const rows = await prisma.proposal.findMany({
      where: { OR: [{ status: { in: ['SENT', 'REVISION_REQUESTED', 'DECLINED'] } }, { status: 'ACCEPTED', respondedAt: { gte: since } }] },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { ...include, project },
      omit: { content: true },
    });
    return { audience: 'manager' as const, items: rows.map((r) => ({ ...serialize({ ...r, content: '' }, 'manager', false), project: r.project })) };
  },
};
