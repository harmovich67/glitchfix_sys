import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarOff, ClipboardList, Clock3, Sparkles, Users } from 'lucide-react';
import { tr } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { PlannedTicket, ProjectDetail, TechnicalReportsResponse } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Checkbox, Select } from '../../components/ui/form';
import { Badge, PriorityBadge } from '../../components/ui/surfaces';
import { Modal } from '../../components/ui/overlay';
import { Spinner } from '../../components/ui/feedback';
import { useOnLeaveToday } from './useTickets';

/**
 * Manager flow: the AI proposes tickets from the client's requirements (optionally anchored to a
 * report), the manager ticks the ones to keep, optionally picks an owner, and only then are they created.
 */
export function TaskPlanDialog({
  project,
  open,
  onOpenChange,
  initialReportId,
}: {
  project: ProjectDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReportId?: string;
}) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [reportId, setReportId] = useState(initialReportId ?? '');
  const [items, setItems] = useState<PlannedTicket[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [assigneeId, setAssigneeId] = useState('');
  /** Owner chosen per proposed ticket (index → user id). */
  const [owners, setOwners] = useState<Record<number, string>>({});
  const onLeave = useOnLeaveToday();

  const reports = useQuery({
    queryKey: ['reports', project.id],
    queryFn: () => api.get<TechnicalReportsResponse>(`/ai/projects/${project.id}/technical-reports`),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setItems(null);
      setPicked(new Set());
      setAssigneeId('');
      setOwners({});
      setReportId(initialReportId ?? '');
    }
  }, [open, initialReportId]);

  const plan = useMutation({
    mutationFn: () => api.post<{ items: PlannedTicket[]; mock: boolean }>(`/ai/projects/${project.id}/task-plan`, { locale, ...(reportId ? { reportId } : {}) }),
    onSuccess: (r) => {
      setItems(r.items);
      setPicked(new Set(r.items.flatMap((it, i) => (it.duplicate ? [] : [i]))));
      setOwners({});
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/projects/${project.id}/tasks/bulk`, {
        ...(reportId ? { reportId } : {}),
        tasks: [...picked].sort((a, b) => a - b).map((i) => {
          const it = items![i];
          return {
            title: it.title,
            description: it.description,
            priority: it.priority,
            stepKey: it.stepKey,
            estimateHours: it.estimateHours,
            assigneeId: owners[i] || null,
          };
        }),
      }),
    onSuccess: () => {
      toast.success(t('tickets.created', { n: picked.size }));
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const stepTitle = useMemo(
    () => new Map(project.workflow.steps.map((s) => [s.key, tr(s, 'title', locale)])),
    [project.workflow.steps, locale],
  );
  const team = project.members.map((m) => m.user);
  // Developers first; if the project only has managers, everyone on it can take work.
  const workers = project.members.filter((m) => m.role === 'DEVELOPER').map((m) => m.user);
  const pool = (workers.length ? workers : team).filter((u) => !onLeave.has(u.id));
  const assignPicked = (id: string) => {
    setAssigneeId(id);
    setOwners((prev) => ({ ...prev, ...Object.fromEntries([...picked].map((i) => [i, id])) }));
  };
  /** Give each requirement group to one developer (round-robin), so everyone owns a coherent slice. */
  const distribute = () => {
    if (!items || !pool.length) return;
    const groups = new Map<string, number>();
    const next: Record<number, string> = {};
    items.forEach((it, i) => {
      if (!picked.has(i)) return;
      const key = it.stepKey ?? `_${i}`;
      if (!groups.has(key)) groups.set(key, groups.size);
      next[i] = pool[groups.get(key)! % pool.length].id;
    });
    setOwners((prev) => ({ ...prev, ...next }));
  };
  const hours = [...picked].reduce((n, i) => n + (items?.[i]?.estimateHours ?? 0), 0);
  const toggle = (i: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('tickets.planTitle')}
      description={t('tickets.planBody')}
      footer={
        items ? (
          <>
            <span className="me-auto self-center text-xs text-muted">
              {t('tickets.selected', { n: picked.size })}
              {hours > 0 && ` · ${t('tickets.hours', { n: hours })}`}
            </span>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button disabled={!picked.size} loading={create.isPending} onClick={() => create.mutate()}>
              {t('tickets.create', { n: picked.size })}
            </Button>
          </>
        ) : undefined
      }
    >
      {!items ? (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-fg-2">{t('tickets.planSource')}</p>
            <Select value={reportId} onChange={(e) => setReportId(e.target.value)} disabled={plan.isPending}>
              <option value="">{t('tickets.sourceReq')}</option>
              {reports.data?.reports.map((r) => (
                <option key={r.id} value={r.id}>{t('tickets.sourceReport', { n: r.version })}{r.stale ? ` · ${t('report.outdated')}` : ''}</option>
              ))}
            </Select>
          </div>
          <Button className="w-full" size="lg" loading={plan.isPending} leftIcon={<Sparkles className="size-4" />} onClick={() => plan.mutate()}>
            {plan.isPending ? t('tickets.planning') : t('tickets.planGenerate')}
          </Button>
          {plan.isPending && <p className="flex items-center justify-center gap-2 text-xs text-muted"><Spinner className="size-4" /> {t('report.generatingHint')}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {team.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-fg-2">{t('tickets.assignAll')}</span>
              <div className="min-w-44 flex-1 sm:max-w-64">
                <Select value={assigneeId} onChange={(e) => assignPicked(e.target.value)}>
                  <option value="">{t('tickets.leaveUnassigned')}</option>
                  {team.map((u) => <option key={u.id} value={u.id}>{u.name}{onLeave.has(u.id) ? ` · ${t('tickets.onLeave')}` : ''}</option>)}
                </Select>
              </div>
              <Button size="sm" variant="soft" leftIcon={<Users className="size-4" />} disabled={!pool.length || !picked.size} onClick={distribute}>{t('tickets.distribute')}</Button>
            </div>
          )}
          <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
            {items.map((it, i) => (
              <li key={i}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors',
                    picked.has(i) ? 'bg-brand-soft/40 ring-brand/30' : 'bg-surface ring-border hover:bg-surface-2/60',
                    it.duplicate && 'opacity-60',
                  )}
                >
                  <Checkbox checked={picked.has(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug [overflow-wrap:anywhere]">{it.title}</span>
                    {it.description && <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-xs text-muted [overflow-wrap:anywhere]">{it.description}</span>}
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={it.priority} />
                      {it.estimateHours ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Clock3 className="size-3" /> {t('tickets.hours', { n: it.estimateHours })}</span>
                      ) : null}
                      {it.stepKey && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-fg-2">
                          <ClipboardList className="size-3" /> {stepTitle.get(it.stepKey) ?? it.stepKey}
                        </span>
                      )}
                      {it.duplicate && <Badge className="bg-warning-soft text-warning ring-warning/20">{t('tickets.duplicate')}</Badge>}
                    </span>
                    {team.length > 0 && (
                      <span className="mt-2 flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                        <span className="text-[11px] text-muted">{t('tickets.owner')}</span>
                        <select
                          value={owners[i] ?? ''}
                          onChange={(e) => setOwners((prev) => ({ ...prev, [i]: e.target.value }))}
                          className="h-7 max-w-[11rem] rounded-lg bg-surface px-2 text-xs ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-brand"
                          aria-label={t('tickets.owner')}
                        >
                          <option value="">{t('common.unassigned')}</option>
                          {team.map((u) => <option key={u.id} value={u.id}>{u.name}{onLeave.has(u.id) ? ` · ${t('tickets.onLeave')}` : ''}</option>)}
                        </select>
                        {owners[i] && onLeave.has(owners[i]) && <span className="inline-flex items-center gap-1 text-[11px] text-warning"><CalendarOff className="size-3" />{t('tickets.onLeave')}</span>}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
