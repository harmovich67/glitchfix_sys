import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CalendarDays, CalendarOff, Check, Clock, Mail, MessageCircle, Phone, Plus, UserCheck, X } from 'lucide-react';
import { LEAVE_KINDS, type LeaveKind } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { AssignableUser, AwayItem, TimeOffRequest, TimeOffSummary } from '../../lib/types';
import { cn, formatDate, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, SegmentedControl, Select, Textarea } from '../../components/ui/form';
import { Badge, Card, CardHeader, PageHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/overlay';
import { Tabs } from '../../components/ui/tabs';

const STATUS_STYLE: Record<TimeOffRequest['status'], string> = {
  PENDING: 'bg-warning-soft text-warning ring-warning/25',
  APPROVED: 'bg-success-soft text-success ring-success/25',
  REJECTED: 'bg-danger-soft text-danger ring-danger/25',
  CANCELLED: 'bg-surface-2 text-muted ring-border',
};
const STATUS_DOT: Record<TimeOffRequest['status'], string> = { PENDING: 'bg-warning', APPROVED: 'bg-success', REJECTED: 'bg-danger', CANCELLED: 'bg-muted' };

const dayCount = (r: Pick<TimeOffRequest, 'startDate' | 'endDate'>) => Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86_400_000) + 1;
const today = () => new Date().toISOString().slice(0, 10);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['timeoff'] });
}

// ── New request ───────────────────────────────────────────────────────────────
function NewRequestModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const invalidate = useInvalidate();
  const blank = { type: 'LEAVE' as 'LEAVE' | 'PERMISSION', leaveKind: 'ANNUAL' as LeaveKind, startDate: today(), endDate: today(), startTime: '10:00', endTime: '12:00', reason: '' };
  const [f, setF] = useState(blank);
  const permission = f.type === 'PERMISSION';

  const create = useMutation({
    mutationFn: () =>
      api.post('/time-off', {
        type: f.type,
        startDate: f.startDate,
        endDate: permission ? f.startDate : f.endDate,
        reason: f.reason,
        ...(permission ? { startTime: f.startTime, endTime: f.endTime } : { leaveKind: f.leaveKind }),
      }),
    onSuccess: () => {
      toast.success(t('timeoff.sent'));
      invalidate();
      setF(blank);
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const invalid = !f.startDate || (!permission && (!f.endDate || f.endDate < f.startDate)) || (permission && (!f.startTime || !f.endTime || f.endTime <= f.startTime));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('timeoff.newRequest')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button disabled={invalid} loading={create.isPending} onClick={() => create.mutate()}>{t('timeoff.submit')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          value={f.type}
          onChange={(type) => setF({ ...f, type })}
          options={[
            { value: 'LEAVE', label: <span className="inline-flex items-center gap-2"><CalendarOff className="size-4" />{t('timeoff.typeLeave')}</span> },
            { value: 'PERMISSION', label: <span className="inline-flex items-center gap-2"><Clock className="size-4" />{t('timeoff.typePermission')}</span> },
          ]}
        />
        {permission ? (
          <p className="text-xs text-muted">{t('timeoff.typePermissionHint')}</p>
        ) : (
          <Field label={t('timeoff.kind')}>
            <Select value={f.leaveKind} onChange={(e) => setF({ ...f, leaveKind: e.target.value as LeaveKind })}>
              {LEAVE_KINDS.map((k) => <option key={k} value={k}>{t(`timeoff.kinds.${k}`)}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={permission ? t('timeoff.date') : t('timeoff.from')}>
            <Input type="date" min={today()} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate })} />
          </Field>
          {permission ? (
            <span />
          ) : (
            <Field label={t('timeoff.to')}>
              <Input type="date" min={f.startDate || today()} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
            </Field>
          )}
          {permission && (
            <>
              <Field label={t('timeoff.startTime')}><Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
              <Field label={t('timeoff.endTime')}><Input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></Field>
            </>
          )}
        </div>
        <Field label={t('timeoff.reason')} hint={t('timeoff.reasonHint')}>
          <Textarea value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={1000} className="min-h-24" />
        </Field>
      </div>
    </Modal>
  );
}

// ── Decision ──────────────────────────────────────────────────────────────────
function DecisionModal({ request, decision, onClose }: { request: TimeOffRequest | null; decision: 'APPROVED' | 'REJECTED'; onClose: () => void }) {
  const { t } = useI18n();
  const invalidate = useInvalidate();
  const [note, setNote] = useState('');
  const send = useMutation({
    mutationFn: () => api.post(`/time-off/${request!.id}/decision`, { decision, note }),
    onSuccess: () => {
      toast.success(t('timeoff.decided'));
      invalidate();
      setNote('');
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const approve = decision === 'APPROVED';
  return (
    <Modal
      open={!!request}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title={approve ? t('timeoff.approveTitle') : t('timeoff.rejectTitle')}
      description={request ? `${request.user.name} · ${describe(request, t)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={approve ? 'primary' : 'danger'} loading={send.isPending} leftIcon={approve ? <Check className="size-4" /> : <X className="size-4" />} onClick={() => send.mutate()}>
            {approve ? t('timeoff.approve') : t('timeoff.reject')}
          </Button>
        </>
      }
    >
      <Field label={t('timeoff.decisionNote')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-24" />
      </Field>
    </Modal>
  );
}

function describe(r: TimeOffRequest, t: (k: string, v?: Record<string, string | number>) => string) {
  if (r.type === 'PERMISSION') return `${r.startDate.slice(0, 10)} · ${r.startTime}–${r.endTime}`;
  const n = dayCount(r);
  return `${r.startDate.slice(0, 10)}${n > 1 ? ` → ${r.endDate.slice(0, 10)}` : ''} · ${t('timeoff.days', { n })}`;
}

// ── Cards ─────────────────────────────────────────────────────────────────────
function ContactLinks({ user }: { user: TimeOffRequest['user'] }) {
  const digits = (s: string) => s.replace(/[^\d+]/g, '');
  const chip = 'inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 text-[11.5px] text-fg-2 ring-1 ring-border hover:bg-brand-soft hover:text-brand';
  return (
    <div className="flex flex-wrap gap-1.5" dir="ltr">
      {user.phone && <a href={`tel:${digits(user.phone)}`} className={chip}><Phone className="size-3" />{user.phone}</a>}
      {user.whatsapp && <a href={`https://wa.me/${digits(user.whatsapp).replace('+', '')}`} target="_blank" rel="noreferrer noopener" className={chip}><MessageCircle className="size-3" />{user.whatsapp}</a>}
      <a href={`mailto:${user.altEmail || user.email}`} className={chip}><Mail className="size-3" />{user.altEmail || user.email}</a>
    </div>
  );
}

function RequestCard({ r, mode, approvers }: { r: TimeOffRequest; mode: 'mine' | 'review'; approvers: AssignableUser[] }) {
  const { t, locale } = useI18n();
  const { user, can } = useAuth();
  const invalidate = useInvalidate();
  const [deciding, setDeciding] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const isAdmin = can('timeoff.review_all');

  const cancel = useMutation({
    mutationFn: () => api.post(`/time-off/${r.id}/cancel`),
    onSuccess: () => {
      toast.success(t('timeoff.cancelled'));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const assign = useMutation({
    mutationFn: (approverId: string) => api.post(`/time-off/${r.id}/assign`, { approverId }),
    onSuccess: () => {
      toast.success(t('timeoff.assigned'));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const pending = r.status === 'PENDING';
  const canDecide = mode === 'review' && pending && (isAdmin || r.approver?.id === user?.id);
  const cancellable = mode === 'mine' && (pending || (r.status === 'APPROVED' && r.startDate.slice(0, 10) > today()));
  const title = r.type === 'LEAVE' ? t(`timeoff.kinds.${r.leaveKind ?? 'ANNUAL'}`) : t('timeoff.typePermission');

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5', r.type === 'LEAVE' ? 'bg-info-soft text-info' : 'bg-brand-soft text-brand')}>
          {r.type === 'LEAVE' ? <CalendarOff /> : <Clock />}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-[14.5px] font-semibold">{title}</p>
            <Badge className={STATUS_STYLE[r.status]} dot={STATUS_DOT[r.status]}>{t(`timeoff.status.${r.status}`)}</Badge>
            <span className="text-[11.5px] text-muted">{t('timeoff.requestedOn', { time: timeAgo(r.createdAt, locale) })}</span>
          </div>

          {mode === 'review' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2.5">
                <Avatar name={r.user.name} size="sm" />
                <span className="text-[13px] font-medium">{r.user.name} <span className="font-normal text-muted">· {t(`roles.${r.user.role}`)}</span></span>
              </span>
              <ContactLinks user={r.user} />
            </div>
          )}

          <p className="flex items-center gap-2 text-[13px] text-fg-2">
            <CalendarDays className="size-4 text-muted" />
            <span>{formatDate(r.startDate, locale)}{r.type === 'LEAVE' && dayCount(r) > 1 ? ` → ${formatDate(r.endDate, locale)}` : ''}</span>
            <span className="text-muted">·</span>
            <span>{r.type === 'PERMISSION' ? <bdi dir="ltr">{r.startTime}–{r.endTime}</bdi> : t('timeoff.days', { n: dayCount(r) })}</span>
          </p>
          {r.reason && <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-[13px] leading-relaxed text-fg-2 [overflow-wrap:anywhere]">{r.reason}</p>}

          {/* Routing: who decides. */}
          {pending && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              {r.approver ? (
                <span className="inline-flex items-center gap-1.5 text-fg-2"><UserCheck className="size-4 text-brand" />{t('timeoff.assignedTo', { name: r.approver.name })}</span>
              ) : (
                <span className="text-warning">{t('timeoff.awaitingAdmin')}</span>
              )}
              {mode === 'review' && isAdmin && (
                <div className="min-w-52">
                  <Select
                    value={r.approver?.id ?? ''}
                    disabled={assign.isPending}
                    onChange={(e) => e.target.value && assign.mutate(e.target.value)}
                    aria-label={t('timeoff.assign')}
                    className="h-8 text-[13px]"
                  >
                    <option value="">{t('timeoff.assignPlaceholder')}</option>
                    {approvers.filter((a) => a.id !== r.userId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
              )}
            </div>
          )}

          {r.decidedBy && (
            <p className="text-[12.5px] text-muted">
              {t('timeoff.decidedBy', { status: t(`timeoff.status.${r.status}`), name: r.decidedBy.name })}
              {r.decidedAt && ` · ${timeAgo(r.decidedAt, locale)}`}
              {r.decisionNote && <span className="mt-1 block text-fg-2 [overflow-wrap:anywhere]">“{r.decisionNote}”</span>}
            </p>
          )}

          {(canDecide || cancellable) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {canDecide && (
                <>
                  <Button size="sm" leftIcon={<Check className="size-4" />} onClick={() => setDeciding('APPROVED')}>{t('timeoff.approve')}</Button>
                  <Button size="sm" variant="secondary" className="text-danger" leftIcon={<X className="size-4" />} onClick={() => setDeciding('REJECTED')}>{t('timeoff.reject')}</Button>
                </>
              )}
              {cancellable && <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate()}>{t('timeoff.cancel')}</Button>}
            </div>
          )}
        </div>
      </div>
      <DecisionModal request={deciding ? r : null} decision={deciding ?? 'APPROVED'} onClose={() => setDeciding(null)} />
    </Card>
  );
}

function AwayCard() {
  const { t, locale } = useI18n();
  const away = useQuery({ queryKey: ['timeoff', 'away'], queryFn: () => api.get<AwayItem[]>('/time-off/away') });
  return (
    <Card>
      <CardHeader title={t('timeoff.away')} icon={<CalendarOff className="size-4" />} />
      <div className="space-y-1 px-3 pb-4">
        {away.data?.length ? (
          away.data.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={a.user.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{a.user.name}</p>
                <p className="text-xs text-muted">{formatDate(a.startDate, locale)} → {formatDate(a.endDate, locale)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="px-2 text-sm text-muted">{t('timeoff.awayEmpty')}</p>
        )}
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TimeOffPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'PENDING' | 'DECIDED' | 'ALL'>('PENDING');

  const summary = useQuery({ queryKey: ['timeoff', 'summary'], queryFn: () => api.get<TimeOffSummary>('/time-off/summary'), refetchInterval: 60_000 });
  const canReview = !!summary.data?.canReview;
  const tab: 'mine' | 'review' = params.get('tab') === 'review' && canReview ? 'review' : 'mine';

  const mine = useQuery({ queryKey: ['timeoff', 'mine'], queryFn: () => api.get<TimeOffRequest[]>('/time-off/mine') });
  const review = useQuery({
    queryKey: ['timeoff', 'review', filter],
    queryFn: () => api.get<TimeOffRequest[]>(`/time-off/review${filter === 'ALL' ? '' : `?status=${filter}`}`),
    enabled: canReview && tab === 'review',
  });
  const approvers = useQuery({
    queryKey: ['assignable'],
    queryFn: () => api.get<AssignableUser[]>('/users/assignable'),
    enabled: can('timeoff.review_all') && tab === 'review',
  });
  const pmList = (approvers.data ?? []).filter((u) => u.role === 'PROJECT_MANAGER');

  const pendingReview = summary.data?.review ?? 0;
  const list = tab === 'mine' ? mine : review;

  return (
    <>
      <PageHeader
        title={t('timeoff.title')}
        subtitle={t('timeoff.subtitle')}
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t('timeoff.newRequest')}</Button>}
      />

      {canReview && (
        <Tabs
          className="mb-6"
          value={tab}
          onChange={(v) => setParams(v === 'mine' ? {} : { tab: v }, { replace: true })}
          items={[
            { value: 'mine', label: t('timeoff.tabMine') },
            {
              value: 'review',
              label: t('timeoff.tabReview'),
              badge: pendingReview ? <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white tabular-nums">{pendingReview}</span> : undefined,
            },
          ]}
        />
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {tab === 'review' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl<'PENDING' | 'DECIDED' | 'ALL'>
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'PENDING', label: t('timeoff.filterPending') },
                  { value: 'DECIDED', label: t('timeoff.filterDecided') },
                  { value: 'ALL', label: t('timeoff.filterAll') },
                ]}
              />
              {can('timeoff.review_all') && !!summary.data?.unassigned && <span className="text-xs font-medium text-warning">{t('timeoff.unassigned', { n: summary.data.unassigned })}</span>}
            </div>
          )}

          {list.isLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : list.data?.length ? (
            list.data.map((r) => <RequestCard key={r.id} r={r} mode={tab} approvers={pmList} />)
          ) : (
            <Card>
              <EmptyState
                icon={<CalendarOff className="size-6" />}
                title={tab === 'mine' ? t('timeoff.empty') : t('timeoff.emptyReview')}
                description={tab === 'mine' ? t('timeoff.emptyBody') : t('timeoff.emptyReviewBody')}
                action={tab === 'mine' ? <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t('timeoff.newRequest')}</Button> : undefined}
              />
            </Card>
          )}
        </div>
        {canReview && <AwayCard />}
      </div>

      <NewRequestModal open={creating} onOpenChange={setCreating} />
    </>
  );
}
