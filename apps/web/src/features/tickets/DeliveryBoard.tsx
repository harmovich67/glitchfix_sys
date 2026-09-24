import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, ListChecks, OctagonAlert, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { ProjectListItem, Task } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Progress, Skeleton } from '../../components/ui/feedback';
import { TicketBoard } from './TicketBoard';
import { TicketDrawer } from './TicketDrawer';
import { ticketStats, useUpdateTicket } from './useTickets';

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: 'danger' | 'warning' | 'success' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-border">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-4',
          tone === 'danger' ? 'bg-danger-soft text-danger' : tone === 'warning' ? 'bg-warning-soft text-warning' : tone === 'success' ? 'bg-success-soft text-success' : 'bg-brand-soft text-brand',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11.5px] text-muted">{label}</p>
      </div>
    </div>
  );
}

/**
 * Cross-project requirement tickets. Developers work from it (their tickets plus unclaimed ones);
 * project managers and admins use the same board to follow delivery, see who is blocked and who is loaded.
 */
export function DeliveryBoard() {
  const { t } = useI18n();
  const { can } = useAuth();
  const isManager = can('projects.view_all');
  const [projectId, setProjectId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const update = useUpdateTicket();

  const projects = useQuery({ queryKey: ['projects', {}], queryFn: () => api.get<ProjectListItem[]>('/projects') });
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (assignee) params.set('assigneeId', assignee);
  const board = useQuery({ queryKey: ['tasks', 'board', projectId, assignee], queryFn: () => api.get<Task[]>(`/tasks/board?${params}`) });
  const tasks = board.data ?? [];
  const stats = ticketStats(tasks);
  const opened = tasks.find((x) => x.id === open) ?? null;

  const people = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; done: number; blocked: number }>();
    for (const task of tasks) {
      if (!task.assignee) continue;
      const row = map.get(task.assignee.id) ?? { id: task.assignee.id, name: task.assignee.name, total: 0, done: 0, blocked: 0 };
      row.total++;
      if (task.status === 'DONE') row.done++;
      else if (task.blockedReason) row.blocked++;
      map.set(task.assignee.id, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [tasks]);

  if (board.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      </div>
    );

  const filtered = !!projectId || !!assignee;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={<ListChecks />} label={t('tickets.total')} value={stats.total} />
        <Metric icon={<CheckCircle2 />} label={t('tickets.progress', { done: stats.done, total: stats.total })} value={`${stats.percent}%`} tone="success" />
        <Metric icon={<Clock />} label={t('tickets.overdueLabel')} value={stats.overdue} tone={stats.overdue ? 'warning' : undefined} />
        <Metric icon={<OctagonAlert />} label={t('tickets.blocked')} value={stats.blocked} tone={stats.blocked ? 'danger' : undefined} />
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-fg-2">{t('tickets.requirementsProgress')}</span>
          <span className="tabular-nums text-muted">{t('tickets.progress', { done: stats.done, total: stats.total })}{stats.hours > 0 && ` · ${t('tickets.hours', { n: stats.hours })}`}</span>
        </div>
        <Progress value={stats.percent} tone="success" />
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-44 flex-1 sm:max-w-72 sm:flex-none">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label={t('tickets.project')}>
            <option value="">{t('tickets.allProjects')}</option>
            {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
          </Select>
        </div>
        <div className="min-w-40 flex-1 sm:max-w-56 sm:flex-none">
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label={t('workspace.assignee')}>
            <option value="">{t('tickets.everyone')}</option>
            <option value="me">{t('tickets.mine')}</option>
            <option value="unassigned">{t('tickets.unassigned')}</option>
            {isManager && people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => { setProjectId(''); setAssignee(''); }}>{t('common.all')}</Button>
        )}
        <span className="ms-auto hidden text-[11px] text-muted md:block">{t('tickets.doneWindow')}</span>
      </div>

      {tasks.length ? (
        <TicketBoard tasks={tasks} showProject onOpen={(x) => setOpen(x.id)} onMove={(id, status) => update.mutate({ id, status })} />
      ) : (
        <Card>
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title={t('tickets.empty')}
            description={isManager ? t('tickets.emptyMgr') : t('tickets.emptyDev')}
            action={isManager ? <Button asChild variant="secondary"><Link to="/app/projects">{t('nav.projects')}</Link></Button> : undefined}
          />
        </Card>
      )}

      {isManager && people.length > 0 && (
        <Card>
          <CardHeader title={t('tickets.teamProgress')} icon={<Users className="size-4" />} />
          <div className="grid gap-x-8 gap-y-4 px-5 pb-5 md:grid-cols-2">
            {people.map((p) => (
              <button key={p.id} type="button" onClick={() => setAssignee(p.id)} className="space-y-1.5 text-start">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={p.name} size="sm" />
                    <span className="truncate text-[13px] font-semibold">{p.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted">
                    {p.blocked > 0 && <span className="inline-flex items-center gap-1 text-danger"><OctagonAlert className="size-3" />{p.blocked}</span>}
                    {t('tickets.of', { done: p.done, total: p.total })}
                  </span>
                </div>
                <Progress value={(p.done / Math.max(1, p.total)) * 100} tone="success" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <TicketDrawer task={opened} onClose={() => setOpen(null)} />
    </div>
  );
}
