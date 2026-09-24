import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Activity, ArrowRight, CheckCircle2, Clock, FolderKanban, Inbox, ListTodo, MessageSquareWarning, Plus, Rocket, TrendingUp, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { BriefUser, ProjectEvent, ProjectListItem, Task } from '../../lib/types';
import { cn, timeAgo } from '../../lib/utils';
import { TASK_STYLE } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, PageHeader, PriorityBadge, StatCard, StatusBadge } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Progress, Skeleton } from '../../components/ui/feedback';
import { NotificationItem, useNotifications } from '../../components/layout/NotificationBell';
import { useCreateProject } from '../projects/useCreateProject';
import { DueLabel, ProjectCard, TypeTile } from '../projects/components';

function useProjects() {
  return useQuery({ queryKey: ['projects', {}], queryFn: () => api.get<ProjectListItem[]>('/projects') });
}

function Greeting({ subtitle, actions }: { subtitle: string; actions?: React.ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  return <PageHeader title={t('dashboard.greeting', { name: user?.name.split(' ')[0] ?? '' })} subtitle={subtitle} actions={actions} />;
}

function RecentNotifications() {
  const { t } = useI18n();
  const { data } = useNotifications();
  return (
    <Card>
      <CardHeader title={t('dashboard.recentActivity')} icon={<Activity className="size-4" />} action={<Link to="/app/notifications" className="text-xs font-medium text-brand">{t('common.viewAll')}</Link>} />
      <div className="px-2 pb-2">
        {data?.items.length ? data.items.slice(0, 6).map((n) => <NotificationItem key={n.id} n={n} />) : <p className="px-3 pb-4 text-sm text-muted">{t('notifications.empty')}</p>}
      </div>
    </Card>
  );
}

function ClientDashboard() {
  const { t } = useI18n();
  const projects = useProjects();
  const create = useCreateProject();
  const underReview = projects.data?.some((p) => p.status === 'UNDER_REVIEW');

  if (projects.isLoading) return <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>;

  if (!projects.data?.length)
    return (
      <>
        <Greeting subtitle={t('dashboard.clientSubtitle')} />
        <Card className="relative overflow-hidden">
          <div className="absolute -top-24 -end-24 size-72 rounded-full bg-brand/15 blur-3xl" />
          <EmptyState
            icon={<Rocket className="size-6" />}
            title={t('dashboard.emptyClientTitle')}
            description={t('dashboard.emptyClientBody')}
            action={<Button size="lg" loading={create.isPending} onClick={() => create.mutate()} leftIcon={<Plus className="size-4" />}>{t('dashboard.startNew')}</Button>}
            className="py-20"
          />
        </Card>
      </>
    );

  return (
    <>
      <Greeting
        subtitle={t('dashboard.clientSubtitle')}
        actions={<Button loading={create.isPending} onClick={() => create.mutate()} leftIcon={<Plus className="size-4" />}>{t('dashboard.startNew')}</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-4 md:grid-cols-2">
          {projects.data.map((p, i) => <ProjectCard key={p.id} p={p} index={i} clientView />)}
        </div>
        <div className="space-y-6">
          {underReview && (
            <Card className="overflow-hidden bg-gradient-to-br from-brand-soft via-surface to-surface p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Clock className="size-4 text-brand" /> {t('dashboard.nextUp')}
              </div>
              <p className="mt-2 text-sm text-muted">{t('dashboard.nextUnder')}</p>
            </Card>
          )}
          <RecentNotifications />
        </div>
      </div>
    </>
  );
}

function DeveloperDashboard() {
  const { t } = useI18n();
  const projects = useProjects();
  const tasks = useQuery({ queryKey: ['tasks', 'mine'], queryFn: () => api.get<Task[]>('/tasks/mine') });
  return (
    <>
      <Greeting subtitle={t('dashboard.devSubtitle')} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('dashboard.assigned')} value={projects.data?.length ?? '—'} icon={<FolderKanban className="size-4" />} />
        <StatCard label={t('dashboard.myTasks')} value={tasks.data?.length ?? '—'} icon={<ListTodo className="size-4" />} tone="info" />
        <StatCard
          label={t('status.DEVELOPMENT')}
          value={projects.data?.filter((p) => p.status === 'DEVELOPMENT').length ?? '—'}
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_400px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-fg-2">{t('dashboard.assigned')}</h2>
          {projects.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2">{projects.data.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}</div>
          ) : (
            <Card><EmptyState icon={<Inbox className="size-6" />} title={t('dashboard.noAssigned')} /></Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('dashboard.myTasks')} icon={<ListTodo className="size-4" />} />
            <div className="px-2 pb-2">
              {tasks.data?.length ? (
                tasks.data.map((task) => (
                  <Link key={task.id} to={`/app/projects/${task.projectId}?tab=workspace`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                    <span className={cn('size-2 shrink-0 rounded-full', TASK_STYLE[task.status])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{task.title}</span>
                      <span className="font-mono text-[11px] text-muted">{task.project?.code}</span>
                    </span>
                    <DueLabel date={task.dueDate} />
                  </Link>
                ))
              ) : (
                <p className="px-3 pb-4 text-sm text-muted">{t('dashboard.noTasks')}</p>
              )}
            </div>
          </Card>
          <RecentNotifications />
        </div>
      </div>
    </>
  );
}

interface Overview {
  kpis: { requests: number; submitted: number; conversionRate: number; active: number; awaitingReview: number; pendingMessages: number; completed: number };
  weekly: { week: string; started: number; submitted: number }[];
  workload: (BriefUser & { title: string | null; capacity: number; activeProjects: number; openTasks: number })[];
  recent: (ProjectEvent & { project: { id: string; code: string; title: string } })[];
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - (v / max) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${pts} 100,32`} fill="url(#spark)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StaffDashboard() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const overview = useQuery({ queryKey: ['analytics', 30], queryFn: () => api.get<Overview>('/analytics/overview?range=30'), enabled: can('analytics.view') });
  const projects = useProjects();
  const unassigned = projects.data?.filter((p) => p.submittedAt && p.members.length === 0 && p.status !== 'COMPLETED') ?? [];
  const k = overview.data?.kpis;

  return (
    <>
      <Greeting
        subtitle={t('dashboard.staffSubtitle')}
        actions={
          <Button asChild variant="secondary" rightIcon={<ArrowRight className="rtl-flip size-4" />}>
            <Link to="/app/projects">{t('nav.projects')}</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[13px] font-medium text-muted">{t('dashboard.newRequests')}</p>
          <p className="mt-3 text-[28px] leading-none font-semibold tabular-nums">{k?.requests ?? '—'}</p>
          <div className="mt-2">{overview.data && <Sparkline data={overview.data.weekly.map((w) => w.started)} />}</div>
        </Card>
        <StatCard label={t('dashboard.awaitingReview')} value={k?.awaitingReview ?? '—'} icon={<Clock className="size-4" />} tone="warning" />
        <StatCard label={t('dashboard.activeProjects')} value={k?.active ?? '—'} icon={<FolderKanban className="size-4" />} tone="info" />
        <StatCard label={t('dashboard.conversion')} value={k ? `${k.conversionRate}%` : '—'} icon={<CheckCircle2 className="size-4" />} tone="success" hint={k && can('messages.moderate') && k.pendingMessages ? (
          <Link to="/app/moderation" className="inline-flex items-center gap-1 font-medium text-warning"><MessageSquareWarning className="size-3.5" />{k.pendingMessages} {t('dashboard.pendingMessages')}</Link>
        ) : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('dashboard.needsAttention')} description={t('dashboard.unassignedProjects')} icon={<Inbox className="size-4" />} />
            <div className="px-2 pb-2">
              {unassigned.length ? (
                unassigned.map((p) => (
                  <Link key={p.id} to={`/app/projects/${p.id}?tab=manage`} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface-2">
                    <TypeTile type={p.projectType} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                      <p className="text-xs text-muted">{p.client.clientProfile?.companyName || p.client.name} · {timeAgo(p.submittedAt!, locale)}</p>
                    </div>
                    <PriorityBadge priority={p.priority} />
                    <StatusBadge status={p.status} short />
                  </Link>
                ))
              ) : (
                <p className="px-3 pb-4 text-sm text-muted">{t('moderation.empty')}</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title={t('dashboard.recentActivity')} icon={<Activity className="size-4" />} />
            <ol className="relative px-5 pb-5">
              {overview.data?.recent.map((e, i) => (
                <motion.li key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="relative flex gap-3 pb-4 last:pb-0">
                  <div className="relative flex flex-col items-center">
                    {e.actor ? <Avatar name={e.actor.name} size="sm" /> : <div className="size-7 rounded-full bg-surface-3" />}
                    {i < overview.data!.recent.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] text-fg">
                      <span className="font-medium">{e.actor?.name ?? t('chat.system')}</span> · {e.title}
                    </p>
                    <Link to={`/app/projects/${e.project.id}`} className="text-xs text-muted hover:text-brand">
                      {e.project.code} — {e.project.title} · {timeAgo(e.createdAt, locale)}
                    </Link>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('dashboard.workload')} icon={<Users className="size-4" />} />
            <div className="space-y-4 px-5 pb-5">
              {overview.data?.workload.map((w) => (
                <div key={w.id}>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <Avatar name={w.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{w.name}</p>
                      <p className="truncate text-[11px] text-muted">{w.title ?? t(`roles.${w.role}`)}</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted">
                      {w.activeProjects}/{w.capacity}
                    </span>
                  </div>
                  <Progress value={(w.activeProjects / Math.max(1, w.capacity)) * 100} />
                </div>
              ))}
            </div>
          </Card>
          <RecentNotifications />
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { user, isClient } = useAuth();
  if (isClient) return <ClientDashboard />;
  if (user?.role === 'DEVELOPER') return <DeveloperDashboard />;
  return <StaffDashboard />;
}
