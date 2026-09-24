import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, LayoutTemplate, MessageSquareWarning, Send, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { ProjectDetail, WireframeItem, WireframesResponse } from '../../lib/types';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, SegmentedControl, Textarea } from '../../components/ui/form';
import { Badge, Card } from '../../components/ui/surfaces';
import { EmptyState, Skeleton } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/overlay';
import { WireframeCanvas } from './WireframeCanvas';

const STATUS_STYLE: Record<WireframeItem['status'], string> = {
  DRAFT: 'bg-surface-2 text-fg-2 ring-border',
  SHARED: 'bg-info-soft text-info ring-info/25',
  APPROVED: 'bg-success-soft text-success ring-success/25',
  CHANGES_REQUESTED: 'bg-warning-soft text-warning ring-warning/25',
  WITHDRAWN: 'bg-surface-2 text-muted ring-border',
  SUPERSEDED: 'bg-surface-2 text-muted ring-border',
};

function StatusBadge({ status }: { status: WireframeItem['status'] }) {
  const { t } = useI18n();
  return <Badge className={STATUS_STYLE[status]}>{t(`wireframe.status.${status}`)}</Badge>;
}

function Versions({ list, activeId, onSelect }: { list: WireframeItem[]; activeId?: string; onSelect: (id: string) => void }) {
  const { t, locale } = useI18n();
  return (
    <ul className="space-y-1">
      {list.map((w, i) => (
        <li key={w.id}>
          <button
            type="button"
            onClick={() => onSelect(w.id)}
            aria-current={w.id === activeId}
            className={cn('flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition-colors', w.id === activeId ? 'bg-brand-soft/60 ring-1 ring-brand/30' : 'hover:bg-surface-2')}
          >
            <span className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold', w.id === activeId ? 'bg-brand text-white' : 'bg-surface-3 text-fg-2')}>{w.version}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-semibold">{t('wireframe.version', { n: w.version })}</span>
                {i === 0 && <Badge className="bg-success-soft py-0 text-[10.5px] text-success ring-success/20">{t('proposal.latest')}</Badge>}
              </span>
              <span className="mt-1 block"><StatusBadge status={w.status} /></span>
              <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(w.sharedAt ?? w.createdAt, locale)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function GenerateDialog({ project, open, onOpenChange, onCreated }: { project: ProjectDetail; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [lang, setLang] = useState<'en' | 'ar'>(locale);
  const [notes, setNotes] = useState('');
  const generate = useMutation({
    mutationFn: () => api.post<WireframeItem>(`/projects/${project.id}/wireframes`, { locale: lang, notes: notes.trim() || undefined }),
    onSuccess: (w) => {
      toast.success(t('wireframe.generated'));
      qc.invalidateQueries({ queryKey: ['wireframes', project.id] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
      setNotes('');
      onOpenChange(false);
      onCreated(w.id);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !generate.isPending && onOpenChange(o)}
      title={t('wireframe.generateTitle')}
      description={t('wireframe.generateHint')}
      footer={
        <>
          <Button variant="secondary" disabled={generate.isPending} onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button loading={generate.isPending} leftIcon={<Sparkles className="size-4" />} onClick={() => generate.mutate()}>{t('wireframe.generate')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('wireframe.language')}>
          <SegmentedControl
            size="sm"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ar', label: 'عربي' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Field>
        <Field label={t('wireframe.notes')} hint={t('wireframe.notesHint')}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className="min-h-28" placeholder={t('wireframe.notesPlaceholder')} />
        </Field>
      </div>
    </Modal>
  );
}

/** What the client answered, or what we are waiting for — shown next to the preview. */
function Facts({ w }: { w: WireframeItem }) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-2 text-[12.5px] text-fg-2">
      {w.sharedAt && (
        <p className="flex items-center gap-2">
          {w.viewedAt ? <Eye className="size-4 text-success" /> : <EyeOff className="size-4 text-muted" />}
          {w.viewedAt ? t('wireframe.openedAt', { time: formatDateTime(w.viewedAt, locale) }) : t('wireframe.notOpened')}
        </p>
      )}
      {w.status === 'APPROVED' && (
        <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="size-4" />{t('wireframe.clientApproved')}</p>
      )}
      {w.status === 'CHANGES_REQUESTED' && (
        <div className="rounded-xl bg-warning-soft/60 p-3 ring-1 ring-warning/25">
          <p className="flex items-center gap-2 font-semibold text-warning"><MessageSquareWarning className="size-4" />{t('wireframe.clientChanges')}</p>
          {w.responseNote && <p className="mt-1.5 whitespace-pre-wrap text-fg [overflow-wrap:anywhere]">{w.responseNote}</p>}
        </div>
      )}
      {w.notes && (
        <p className="rounded-xl bg-surface-2/70 p-3 ring-1 ring-border">
          <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{t('wireframe.privateNotes')}</span>
          <span className="mt-1 block whitespace-pre-wrap [overflow-wrap:anywhere]">{w.notes}</span>
        </p>
      )}
    </div>
  );
}

function ClientDecision({ project, w }: { project: ProjectDetail; w: WireframeItem }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState('');
  const respond = useMutation({
    mutationFn: (body: { action: 'APPROVE' | 'REQUEST_CHANGES'; note?: string }) => api.post(`/projects/${project.id}/wireframes/${w.id}/respond`, body),
    onSuccess: () => {
      toast.success(t('wireframe.thanks'));
      setChanging(false);
      setNote('');
      qc.invalidateQueries({ queryKey: ['wireframes', project.id] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (w.status === 'APPROVED') return <Facts w={w} />;
  if (w.status === 'CHANGES_REQUESTED')
    return (
      <div className="space-y-2">
        <Facts w={w} />
        <p className="text-[12.5px] text-muted">{t('wireframe.waitingRevision')}</p>
      </div>
    );
  if (w.status !== 'SHARED') return null;
  return (
    <Card className="space-y-3 bg-gradient-to-br from-brand-soft/60 via-surface to-surface p-5 ring-brand/25">
      <div>
        <p className="text-[15px] font-semibold">{t('wireframe.decideTitle')}</p>
        <p className="mt-0.5 text-[13px] text-muted">{t('wireframe.decideBody')}</p>
      </div>
      {changing ? (
        <div className="space-y-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-24" placeholder={t('wireframe.changesPlaceholder')} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChanging(false)}>{t('common.cancel')}</Button>
            <Button loading={respond.isPending} disabled={note.trim().length < 3} onClick={() => respond.mutate({ action: 'REQUEST_CHANGES', note })}>{t('wireframe.sendChanges')}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button loading={respond.isPending} leftIcon={<CheckCircle2 className="size-4" />} onClick={() => respond.mutate({ action: 'APPROVE' })}>{t('wireframe.looksGood')}</Button>
          <Button variant="secondary" onClick={() => setChanging(true)}>{t('wireframe.requestChanges')}</Button>
        </div>
      )}
    </Card>
  );
}

/**
 * "Design sketch" tab. The team asks the AI for a rough layout of the product from the client's requirements,
 * reviews it, and shares it; the client sees the shared version and says it looks right or asks for changes.
 */
export function WireframePanel({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const q = useQuery({ queryKey: ['wireframes', project.id], queryFn: () => api.get<WireframesResponse>(`/projects/${project.id}/wireframes`) });
  const list = q.data?.wireframes ?? [];
  const canManage = !!q.data?.canManage;
  const active = list.find((w) => w.id === selected) ?? list[0];

  // Opening the tab is what counts as the client having seen it.
  const seen = project.access.isOwner && active?.status === 'SHARED' && !active.viewedAt ? active.id : null;
  useEffect(() => {
    if (seen) api.post(`/projects/${project.id}/wireframes/${seen}/view`).catch(() => undefined);
  }, [seen, project.id]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['wireframes', project.id] });
    qc.invalidateQueries({ queryKey: ['timeline', project.id] });
  };
  const act = useMutation({
    mutationFn: ({ path, ok }: { path: 'share' | 'withdraw'; ok: string }) => api.post<WireframeItem>(`/projects/${project.id}/wireframes/${active!.id}/${path}`).then((r) => ({ r, ok })),
    onSuccess: ({ ok }) => {
      toast.success(ok);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}/wireframes/${active!.id}`),
    onSuccess: () => {
      setConfirmDelete(false);
      setSelected(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <Skeleton className="h-96" />;

  if (!list.length)
    return (
      <>
        <EmptyState
          icon={<LayoutTemplate className="size-6" />}
          title={t('wireframe.emptyTitle')}
          description={q.data?.submitted === false && canManage ? t('wireframe.emptyNotSubmitted') : t('wireframe.emptyBody')}
          action={canManage ? <Button leftIcon={<Sparkles className="size-4" />} onClick={() => setGenerating(true)}>{t('wireframe.generate')}</Button> : undefined}
        />
        {canManage && <GenerateDialog project={project} open={generating} onOpenChange={setGenerating} onCreated={setSelected} />}
      </>
    );

  const live = active && ['SHARED', 'CHANGES_REQUESTED', 'APPROVED'].includes(active.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-3">
        {canManage && (
          <Button className="w-full" leftIcon={<Sparkles className="size-4" />} onClick={() => setGenerating(true)}>
            {t('wireframe.generateNew')}
          </Button>
        )}
        <Card className="p-2">
          <Versions list={list} activeId={active?.id} onSelect={setSelected} />
        </Card>
      </div>

      {active && (
        <div className="min-w-0 space-y-5">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{active.spec.title}</h2>
                  <StatusBadge status={active.status} />
                  {canManage && active.mock && <Badge>{t('common.demo')}</Badge>}
                </div>
                {active.spec.summary && <p className="mt-1 max-w-2xl text-[13px] text-muted">{active.spec.summary}</p>}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {active.status === 'DRAFT' && (
                    <Button loading={act.isPending} leftIcon={<Send className="size-4" />} onClick={() => act.mutate({ path: 'share', ok: t('wireframe.sharedOk') })}>{t('wireframe.share')}</Button>
                  )}
                  {live && (
                    <Button variant="secondary" loading={act.isPending} leftIcon={<Undo2 className="size-4" />} onClick={() => act.mutate({ path: 'withdraw', ok: t('wireframe.withdrawnOk') })}>{t('wireframe.withdraw')}</Button>
                  )}
                  {!live && (
                    <Button variant="ghost" className="text-danger hover:bg-danger-soft" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>{t('common.delete')}</Button>
                  )}
                </div>
              )}
            </div>
            {project.access.isOwner ? <ClientDecision project={project} w={active} /> : <Facts w={active} />}
          </Card>

          <Card className="p-5">
            <p className="mb-4 text-[12px] text-muted">{t('wireframe.disclaimer')}</p>
            <WireframeCanvas spec={active.spec} locale={active.locale} />
          </Card>
        </div>
      )}

      {canManage && <GenerateDialog project={project} open={generating} onOpenChange={setGenerating} onCreated={setSelected} />}
      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('wireframe.deleteTitle')}
        description={t('wireframe.deleteBody')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>{t('common.delete')}</Button>
          </>
        }
      />
    </div>
  );
}
