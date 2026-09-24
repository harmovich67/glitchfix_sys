import type { Request } from 'express';
import { Prisma, type TimeOffRequest } from '@prisma/client';
import type { z } from 'zod';
import { can, type assignTimeOffSchema, type createTimeOffSchema, type decideTimeOffSchema } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { briefUserSelect, contactUserSelect } from '../users/users.repository';

const include = {
  user: { select: contactUserSelect },
  approver: { select: briefUserSelect },
  assignedBy: { select: briefUserSelect },
  decidedBy: { select: briefUserSelect },
} satisfies Prisma.TimeOffRequestInclude;

const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const todayUtc = () => day(new Date().toISOString().slice(0, 10));
const LINK_REVIEW = '/app/time-off?tab=review';
const LINK_MINE = '/app/time-off';

type Span = Pick<TimeOffRequest, 'type' | 'startDate' | 'endDate' | 'startTime' | 'endTime'>;

/** Leaves clash with anything on the same days; two permissions clash only when their hours overlap. */
function clash(a: Span, b: Span) {
  if (a.startDate > b.endDate || b.startDate > a.endDate) return false;
  if (a.type === 'PERMISSION' && b.type === 'PERMISSION') return (a.startTime ?? '') < (b.endTime ?? '') && (b.startTime ?? '') < (a.endTime ?? '');
  return true;
}

/** Admins see and route everything; a project manager only sees what an admin assigned to them. */
function reviewScope(user: AuthUser): Prisma.TimeOffRequestWhereInput | null {
  if (can(user.role, 'timeoff.review_all')) return {};
  if (user.role === 'PROJECT_MANAGER') return { approverId: user.id };
  return null;
}

async function adminIds(exclude?: string) {
  const rows = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true }, select: { id: true } });
  return rows.map((r) => r.id).filter((id) => id !== exclude);
}

const describe = (r: Pick<TimeOffRequest, 'type' | 'startDate' | 'endDate' | 'startTime' | 'endTime'>) =>
  r.type === 'PERMISSION'
    ? `${isoDay(r.startDate)} ${r.startTime}–${r.endTime}`
    : r.startDate.getTime() === r.endDate.getTime()
      ? isoDay(r.startDate)
      : `${isoDay(r.startDate)} → ${isoDay(r.endDate)}`;

export const timeOffService = {
  mine: (user: AuthUser) => prisma.timeOffRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100, include }),

  /** Numbers for the nav badge and tab counters. */
  async summary(user: AuthUser) {
    const scope = reviewScope(user);
    const [mine, review, unassigned] = await Promise.all([
      prisma.timeOffRequest.count({ where: { userId: user.id, status: 'PENDING' } }),
      scope ? prisma.timeOffRequest.count({ where: { ...scope, status: 'PENDING', userId: { not: user.id } } }) : 0,
      can(user.role, 'timeoff.review_all') ? prisma.timeOffRequest.count({ where: { status: 'PENDING', approverId: null, userId: { not: user.id } } }) : 0,
    ]);
    return { mine, review, unassigned, canReview: !!scope };
  },

  async create(req: Request, user: AuthUser, input: z.infer<typeof createTimeOffSchema>) {
    if (user.role === 'CLIENT') throw forbidden();
    const candidate: Span = {
      type: input.type,
      startDate: day(input.startDate),
      endDate: day(input.endDate),
      startTime: input.type === 'PERMISSION' ? (input.startTime ?? null) : null,
      endTime: input.type === 'PERMISSION' ? (input.endTime ?? null) : null,
    };
    const active = await prisma.timeOffRequest.findMany({
      where: { userId: user.id, status: { in: ['PENDING', 'APPROVED'] }, endDate: { gte: candidate.startDate }, startDate: { lte: candidate.endDate } },
    });
    if (active.some((r) => clash(candidate, r))) throw conflict('You already have a pending or approved request that overlaps these dates');

    const created = await prisma.timeOffRequest.create({
      data: {
        userId: user.id,
        ...candidate,
        leaveKind: input.type === 'LEAVE' ? (input.leaveKind ?? 'ANNUAL') : null,
        reason: input.reason,
      },
      include,
    });
    await notificationsService.notify(await adminIds(user.id), {
      type: 'timeoff.requested',
      title: `${created.type === 'LEAVE' ? 'Leave' : 'Permission'} request · ${user.name}`,
      body: describe(created),
      link: LINK_REVIEW,
      email: true,
    });
    await auditService.log(req, { action: 'timeoff.requested', entityType: 'TimeOffRequest', entityId: created.id, meta: { type: created.type, span: describe(created) } });
    return created;
  },

  /** The requester withdraws a pending request, or an approved one that has not started yet. */
  async cancel(req: Request, user: AuthUser, id: string) {
    const r = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!r || r.userId !== user.id) throw notFound('Request');
    const cancellable = r.status === 'PENDING' || (r.status === 'APPROVED' && r.startDate > todayUtc());
    if (!cancellable) throw badRequest('This request can no longer be cancelled');
    const updated = await prisma.timeOffRequest.update({ where: { id }, data: { status: 'CANCELLED' }, include });
    if (r.approverId)
      await notificationsService.notify([r.approverId], { type: 'timeoff.cancelled', title: `${user.name} cancelled a time-off request`, body: describe(r), link: LINK_REVIEW });
    await auditService.log(req, { action: 'timeoff.cancelled', entityType: 'TimeOffRequest', entityId: id });
    return updated;
  },

  async review(user: AuthUser, status?: string) {
    const scope = reviewScope(user);
    if (!scope) throw forbidden();
    return prisma.timeOffRequest.findMany({
      where: { ...scope, userId: { not: user.id }, ...(status === 'PENDING' ? { status: 'PENDING' } : status === 'DECIDED' ? { status: { in: ['APPROVED', 'REJECTED'] } } : {}) },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include,
    });
  },

  /** Admin picks which project manager decides. Re-assigning is allowed until it is decided. */
  async assign(req: Request, user: AuthUser, id: string, input: z.infer<typeof assignTimeOffSchema>) {
    if (!can(user.role, 'timeoff.review_all')) throw forbidden();
    const r = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!r) throw notFound('Request');
    if (r.status !== 'PENDING') throw badRequest('Only pending requests can be assigned');
    const approver = await prisma.user.findUnique({ where: { id: input.approverId } });
    if (!approver || !approver.isActive || approver.role !== 'PROJECT_MANAGER') throw badRequest('Choose an active project manager');
    if (approver.id === r.userId) throw badRequest('A request cannot be approved by the person who made it');
    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: { approverId: approver.id, assignedById: user.id, assignedAt: new Date() },
      include,
    });
    if (approver.id !== r.approverId)
      await notificationsService.notify([approver.id], {
        type: 'timeoff.assigned',
        title: `Approve or reject: ${updated.user.name}`,
        body: `${updated.type === 'LEAVE' ? 'Leave' : 'Permission'} · ${describe(updated)}`,
        link: LINK_REVIEW,
        email: true,
      });
    await auditService.log(req, { action: 'timeoff.assigned', entityType: 'TimeOffRequest', entityId: id, meta: { approverId: approver.id } });
    return updated;
  },

  /** Approve or reject: the assigned project manager, or an admin. Nobody decides their own request. */
  async decide(req: Request, user: AuthUser, id: string, input: z.infer<typeof decideTimeOffSchema>) {
    const r = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!r) throw notFound('Request');
    const allowed = can(user.role, 'timeoff.review_all') || (user.role === 'PROJECT_MANAGER' && r.approverId === user.id);
    if (!allowed) throw forbidden();
    if (r.userId === user.id) throw forbidden('You cannot decide your own request');
    if (r.status !== 'PENDING') throw conflict('This request was already decided');

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: { status: input.decision, decidedById: user.id, decidedAt: new Date(), decisionNote: input.note || null },
      include,
    });
    const approved = input.decision === 'APPROVED';
    await notificationsService.notify([r.userId], {
      type: 'timeoff.decided',
      title: `Your ${r.type === 'LEAVE' ? 'leave' : 'permission'} request was ${approved ? 'approved' : 'rejected'}`,
      body: `${describe(r)}${input.note ? ` — ${input.note}` : ''}`,
      link: LINK_MINE,
      email: true,
    });
    // Admins stay informed when a project manager decides on their behalf.
    if (!can(user.role, 'timeoff.review_all'))
      await notificationsService.notify(await adminIds(user.id), {
        type: 'timeoff.decided',
        title: `${user.name} ${approved ? 'approved' : 'rejected'} ${updated.user.name}’s request`,
        body: describe(r),
        link: LINK_REVIEW,
      });
    await auditService.log(req, { action: `timeoff.${approved ? 'approved' : 'rejected'}`, entityType: 'TimeOffRequest', entityId: id, meta: { requesterId: r.userId } });
    return updated;
  },

  /** Approved leave in the next weeks, so managers can plan who to give tickets to. */
  async away(user: AuthUser) {
    if (user.role === 'CLIENT') throw forbidden();
    const from = todayUtc();
    const to = new Date(from.getTime() + 30 * 24 * 3600 * 1000);
    return prisma.timeOffRequest.findMany({
      where: { status: 'APPROVED', type: 'LEAVE', endDate: { gte: from }, startDate: { lte: to } },
      orderBy: { startDate: 'asc' },
      select: { id: true, startDate: true, endDate: true, leaveKind: true, user: { select: briefUserSelect } },
    });
  },
};
