import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, FilePenLine, FileText, Pencil, Plus, RefreshCw, Send, Sparkles, Undo2 } from 'lucide-react';
import { formatMoney } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { ProjectDetail, ProposalDetail, ProposalItem, ProposalsResponse } from '../../lib/types';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Textarea } from '../../components/ui/form';
import { Badge, Card } from '../../components/ui/surfaces';
import { EmptyState, Skeleton, Spinner } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/overlay';
import { ClientDecision } from './ClientDecision';
import { ProposalDocument } from './ProposalDocument';
import { ProposalFormDialog } from './ProposalFormDialog';

const STATUS_STYLE: Record<ProposalItem['status'], string> = {
  DRAFT: 'bg-surface-2 text-fg-2 ring-border',
  SENT: 'bg-info-soft text-info ring-info/25',
  ACCEPTED: 'bg-success-soft text-success ring-success/25',
  DECLINED: 'bg-danger-soft text-danger ring-danger/25',
  REVISION_REQUESTED: 'bg-warning-soft text-warning ring-warning/25',
  WITHDRAWN: 'bg-surface-2 text-muted ring-border',
  SUPERSEDED: 'bg-surface-2 text-muted ring-border',
};

export function ProposalStatusBadge({ status, expired }: { status: ProposalItem['status']; expired?: boolean }) {
  const { t } = useI18n();
  return <Badge className={STATUS_STYLE[expired ? 'DECLINED' : status]}>{expired ? t('proposal.expired') : t(`proposal.status.${status}`)}</Badge>;
}

function VersionItem({ p, selected, latest, onSelect, isLast, showMoney }: { p: ProposalItem; selected: boolean; latest: boolean; onSelect: () => void; isLast: boolean; showMoney: boolean }) {
  const { t, locale } = useI18n();
  return (
    <li className="relative">
      {!isLast && <span className="absolute start-[17px] top-10 bottom-[-6px] w-px bg-border" />}
      <button type="button" onClick={onSelect} aria-current={selected} className={cn('relative flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition-colors', selected ? 'bg-brand-soft/60 ring-1 ring-brand/30' : 'hover:bg-surface-2')}>
        <span className={cn('relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-surface', selected ? 'bg-brand text-white' : 'bg-surface-3 text-fg-2')}>{p.version}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold">{t('proposal.version', { n: p.version })}</span>
            {latest && <Badge className="bg-success-soft py-0 text-[10.5px] text-success ring-success/20">{t('proposal.latest')}</Badge>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5"><ProposalStatusBadge status={p.status} expired={p.expired} /></span>
          {showMoney && <span className="mt-1 block text-[12.5px] font-semibold tabular-nums text-fg-2">{formatMoney(p.totals.total, p.currency, locale)}</span>}
          <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(p.sentAt ?? p.createdAt, locale)}</span>
        </span>
      </button>
    </li>
  );
}

/** Where a proposal is in its life: drafted → sent → opened → decided. */
function Progress({ p }: { p: ProposalItem }) {
  const { t, locale } = useI18n();
  const steps = [
    { label: t('proposal.manage.steps.drafted'), at: p.createdAt, done: true },
    { label: t('proposal.manage.steps.sent'), at: p.sentAt, done: !!p.sentAt },
    { label: t('proposal.manage.steps.opened'), at: p.viewedAt, done: !!p.viewedAt, hint: p.sentAt && !p.viewedAt ? t('proposal.manage.notOpened') : undefined },
    { label: t('proposal.manage.steps.decided'), at: p.respondedAt, done: !!p.respondedAt, hint: p.sentAt && !p.respondedAt && !['WITHDRAWN', 'SUPERSEDED'].includes(p.status) ? t('proposal.manage.awaiting') : undefined },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((s, i) => (
        <li key={i} className={cn('rounded-xl p-3 ring-1', s.done ? 'bg-surface ring-border' : 'bg-surface-2/40 ring-border/60')}>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <span className={cn('size-2 rounded-full', s.done ? 'bg-success' : 'bg-surface-3')} />
            {s.label}
          </p>
          <p className="mt-1 text-[11.5px] text-muted">{s.at ? formatDateTime(s.at, locale) : (s.hint ?? '—')}</p>
        </li>
      ))}
    </ol>
  );
}

function TextEditor({ p, projectId, onClose }: { p: ProposalDetail; projectId: string; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [content, setContent] = useState(p.content);
  const [terms, setTerms] = useState(p.terms);
  const save = useMutation({
    mutationFn: () => api.patch(`/projects/${projectId}/proposals/${p.id}`, { content, terms }),
    onSuccess: () => {
      toast.success(t('proposal.manage.saved'));
      qc.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card className="space-y-4 p-5">
      <Field label={t('proposal.manage.textLabel')}>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[360px] font-mono text-[13px] leading-6" dir={p.locale === 'ar' ? 'rtl' : 'ltr'} />
      </Field>
      <Field label={t('proposal.manage.termsLabel')}>
        <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-40 font-mono text-[13px] leading-6" dir={p.locale === 'ar' ? 'rtl' : 'ltr'} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('proposal.manage.cancel')}</Button>
        <Button loading={save.isPending} disabled={content.trim().length < 20} onClick={() => save.mutate()}>{t('proposal.form.save')}</Button>
      </div>
    </Card>
  );
}

function ManagerView({ project, data }: { project: ProjectDetail; data: ProposalsResponse }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(false);
  const [confirm, setConfirm] = useState<'send' | 'withdraw' | 'rewrite' | null>(null);
  const [rewriteNotes, setRewriteNotes] = useState('');

  const list = data.proposals;
  const latestId = list[0]?.id;
  const activeId = selected && list.some((p) => p.id === selected) ? selected : latestId;
  const item = list.find((p) => p.id === activeId);
  const detail = useQuery({ queryKey: ['proposals', project.id, activeId], queryFn: () => api.get<ProposalDetail>(`/projects/${project.id}/proposals/${activeId}`), enabled: !!activeId });
  const p = detail.data && detail.data.id === activeId ? detail.data : null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['proposals'] });
    qc.invalidateQueries({ queryKey: ['timeline', project.id] });
  };
  const act = (path: string, ok?: string, method: 'post' = 'post') =>
    useMutation({
      mutationFn: (body?: unknown) => api[method]<ProposalDetail>(`/projects/${project.id}/proposals/${activeId}/${path}`, body),
      onSuccess: (r) => {
        if (ok) toast.success(ok);
        setConfirm(null);
        if (path === 'revise') setSelected(r.id);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const send = act('send', t('proposal.manage.sentOk'));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const withdraw = act('withdraw');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const revise = act('revise');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rewrite = act('regenerate', t('proposal.manage.saved'));

  const preparedFor = project.client.clientProfile?.companyName || project.client.name;
  const canCreate = data.submitted && !data.hasAccepted;

  if (!list.length)
    return (
      <>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-brand/15 blur-3xl" />
          <EmptyState
            icon={<FileText className="size-6" />}
            title={t('proposal.emptyTitle')}
            description={data.submitted ? t('proposal.emptyBody') : t('proposal.needSubmitted')}
            action={canCreate ? <Button size="lg" leftIcon={<Sparkles className="size-4" />} onClick={() => setCreating(true)}>{t('proposal.newProposal')}</Button> : undefined}
            className="py-16"
          />
        </Card>
        <ProposalFormDialog project={project} defaults={data.defaults} open={creating} onOpenChange={setCreating} onSaved={(r) => setSelected(r.id)} />
      </>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('proposal.proposals')}</h2>
          {!data.submitted && <p className="text-xs text-warning">{t('proposal.needSubmitted')}</p>}
          {data.hasAccepted && <p className="text-xs text-success">{t('proposal.acceptedLocked')}</p>}
        </div>
        {canCreate && <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t('proposal.newProposal')}</Button>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-20">
          <div className="px-4 pt-4 pb-2 text-[13px] font-semibold">{t('proposal.proposals')}</div>
          <ul className="chic-scrollbar max-h-[60vh] space-y-1 overflow-y-auto px-2 pb-3">
            {list.map((x, i) => <VersionItem key={x.id} p={x} selected={x.id === activeId} latest={x.id === latestId} onSelect={() => { setSelected(x.id); setEditText(false); }} isLast={i === list.length - 1} showMoney />)}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          {!item || !p ? (
            <Skeleton className="h-[520px] rounded-2xl" />
          ) : (
            <>
              <Card className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ProposalStatusBadge status={p.status} expired={p.expired} />
                  <span className="text-[13px] font-semibold tabular-nums">{formatMoney(p.totals.total, p.currency, locale)}</span>
                  {p.mock !== undefined && <span className="text-[11.5px] text-muted">· {p.mock ? t('proposal.manage.demoInfo') : t('proposal.manage.aiInfo', { model: p.model ?? '' })}</span>}
                  <span className="flex-1" />
                  {p.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>{t('proposal.manage.editDetails')}</Button>
                      <Button size="sm" variant="secondary" leftIcon={<FilePenLine className="size-4" />} onClick={() => setEditText((v) => !v)}>{t('proposal.manage.editText')}</Button>
                      <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="size-4" />} onClick={() => { setRewriteNotes(p.notes ?? ''); setConfirm('rewrite'); }}>{t('proposal.manage.regenerate')}</Button>
                      <Button size="sm" leftIcon={<Send className="rtl-flip size-4" />} onClick={() => setConfirm('send')}>{t('proposal.manage.send')}</Button>
                    </>
                  )}
                  {p.status === 'SENT' && (
                    <Button size="sm" variant="secondary" leftIcon={<Undo2 className="size-4" />} onClick={() => setConfirm('withdraw')}>{t('proposal.manage.withdraw')}</Button>
                  )}
                  {['SENT', 'REVISION_REQUESTED', 'DECLINED', 'SUPERSEDED', 'WITHDRAWN'].includes(p.status) && !data.hasAccepted && (
                    <Button size="sm" leftIcon={<Plus className="size-4" />} loading={revise.isPending} onClick={() => revise.mutate(undefined)}>{t('proposal.manage.revise')}</Button>
                  )}
                </div>

                {p.status !== 'DRAFT' && <Progress p={p} />}
                {p.status === 'SENT' && p.viewedAt === null && (
                  <p className="flex items-center gap-2 text-xs text-muted"><EyeOff className="size-3.5" /> {t('proposal.manage.notOpened')}</p>
                )}
                {p.viewedAt && p.status === 'SENT' && <p className="flex items-center gap-2 text-xs text-success"><Eye className="size-3.5" /> {t('proposal.manage.steps.opened')} · {timeAgo(p.viewedAt, locale)}</p>}
                {(p.status === 'REVISION_REQUESTED' || p.status === 'DECLINED') && (
                  <div className="rounded-xl bg-warning-soft p-3.5 ring-1 ring-warning/25">
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-warning"><AlertTriangle className="size-4" /> {t('proposal.manage.clientNote')}</p>
                    <p className="mt-1.5 text-[13.5px] text-fg-2 [overflow-wrap:anywhere]">{p.responseNote || '—'}</p>
                  </div>
                )}
                {p.notes && p.status === 'DRAFT' && (
                  <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-xs text-muted"><b className="font-semibold text-fg-2">{t('proposal.manage.privateNotes')}:</b> {p.notes}</p>
                )}
              </Card>

              {editText && p.status === 'DRAFT' ? (
                <TextEditor p={p} projectId={project.id} onClose={() => setEditText(false)} />
              ) : (
                <ProposalDocument proposal={p} preparedFor={preparedFor} />
              )}
            </>
          )}
        </div>
      </div>

      <ProposalFormDialog project={project} defaults={data.defaults} open={creating} onOpenChange={setCreating} onSaved={(r) => { setSelected(r.id); setEditText(false); }} />
      {item && item.status === 'DRAFT' && (
        <ProposalFormDialog project={project} defaults={data.defaults} editing={item} open={editing} onOpenChange={setEditing} onSaved={() => undefined} />
      )}

      <Modal
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        size="sm"
        title={confirm === 'send' ? t('proposal.manage.sendTitle') : confirm === 'withdraw' ? t('proposal.manage.withdrawTitle') : t('proposal.manage.rewriteTitle')}
        description={confirm === 'send' ? t('proposal.manage.sendBody') : confirm === 'withdraw' ? t('proposal.manage.withdrawBody') : t('proposal.manage.rewriteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>{t('proposal.manage.cancel')}</Button>
            {confirm === 'send' && <Button loading={send.isPending} leftIcon={<Send className="rtl-flip size-4" />} onClick={() => send.mutate(undefined)}>{t('proposal.manage.send')}</Button>}
            {confirm === 'withdraw' && <Button variant="danger" loading={withdraw.isPending} onClick={() => withdraw.mutate(undefined)}>{t('proposal.manage.withdraw')}</Button>}
            {confirm === 'rewrite' && <Button loading={rewrite.isPending} leftIcon={<Sparkles className="size-4" />} onClick={() => rewrite.mutate({ notes: rewriteNotes })}>{t('proposal.manage.regenerate')}</Button>}
          </>
        }
      >
        {confirm === 'rewrite' && (
          <div className="space-y-3">
            <Field label={t('proposal.manage.rewriteNotes')}><Textarea value={rewriteNotes} onChange={(e) => setRewriteNotes(e.target.value)} maxLength={2000} className="min-h-24" /></Field>
            {rewrite.isPending && <p className="flex items-center gap-2 text-xs text-muted"><Spinner className="size-4" /> {t('proposal.form.generating')}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ClientView({ project, data }: { project: ProjectDetail; data: ProposalsResponse }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const list = data.proposals;
  const latestId = list[0]?.id;
  const activeId = selected && list.some((p) => p.id === selected) ? selected : latestId;
  const detail = useQuery({ queryKey: ['proposals', project.id, activeId], queryFn: () => api.get<ProposalDetail>(`/projects/${project.id}/proposals/${activeId}`), enabled: !!activeId });
  const p = detail.data && detail.data.id === activeId ? detail.data : null;

  if (!list.length)
    return (
      <Card>
        <EmptyState icon={<FileText className="size-6" />} title={t('proposal.emptyTitle')} description={t('proposal.emptyClient')} className="py-16" />
      </Card>
    );

  return (
    <div className="space-y-4">
      {list.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {list.map((x) => (
            <button key={x.id} type="button" onClick={() => setSelected(x.id)} className={cn('flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-medium ring-1 transition', x.id === activeId ? 'bg-brand-soft text-brand ring-brand/30' : 'bg-surface ring-border hover:bg-surface-2')}>
              {t('proposal.version', { n: x.version })} <ProposalStatusBadge status={x.status} expired={x.expired} />
            </button>
          ))}
        </div>
      )}
      {p ? (
        <ProposalDocument proposal={p} preparedFor={project.client.clientProfile?.companyName || project.client.name} footer={<ClientDecision proposal={p} latestId={latestId} />} />
      ) : (
        <Skeleton className="h-[560px] rounded-2xl" />
      )}
    </div>
  );
}

/** Project → Proposal tab. Managers price, draft, send and follow; the client reads and approves. */
export function ProposalPanel({ project }: { project: ProjectDetail }) {
  const { isClient } = useAuth();
  const q = useQuery({ queryKey: ['proposals', project.id], queryFn: () => api.get<ProposalsResponse>(`/projects/${project.id}/proposals`) });
  if (q.isLoading || !q.data) return <Skeleton className="h-96 rounded-2xl" />;
  return isClient ? <ClientView project={project} data={q.data} /> : <ManagerView project={project} data={q.data} />;
}
