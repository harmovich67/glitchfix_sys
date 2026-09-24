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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        <Card className="p-3.5 sm:p-5 flex flex-col justify-between min-h-[105px] sm:min-h-[120px]">
          <div>
            <p className="text-xs sm:text-[13px] font-medium text-muted leading-snug break-words">{t('dashboard.newRequests')}</p>
            <p className="mt-2 sm:mt-2.5 text-xl sm:text-[28px] leading-none font-bold tracking-tight text-fg tabular-nums">{k?.requests ?? '—'}</p>
          </div>
          <div className="mt-2">{overview.data && <Sparkline data={overview.data.weekly.map((w) => w.started)} />}</div>
        </Card>
        <StatCard label={t('dashboard.awaitingReview')} value={k?.awaitingReview ?? '—'} icon={<Clock className="size-4" />} tone="warning" />
        <StatCard label={t('dashboard.activeProjects')} value={k?.active ?? '—'} icon={<FolderKanban className="size-4" />} tone="info" />
        <StatCard
          label={t('dashboard.conversion')}
          value={k ? `${k.conversionRate}%` : '—'}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          hint={
            k && can('messages.moderate') && k.pendingMessages ? (
              <Link to="/app/moderation" className="inline-flex items-center gap-1 font-medium text-warning break-words leading-tight">
                <MessageSquareWarning className="size-3.5 shrink-0" />
                <span>
                  {k.pendingMessages} {t('dashboard.pendingMessages')}
                </span>
              </Link>
            ) : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader title={t('dashboard.needsAttention')} description={t('dashboard.unassignedProjects')} icon={<Inbox className="size-4" />} />
            <div className="p-2 sm:p-3 space-y-1.5">
              {unassigned.length ? (
                unassigned.map((p) => (
                  <Link
                    key={p.id}
                    to={`/app/projects/${p.id}?tab=manage`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-xl p-2.5 sm:p-3 hover:bg-surface-2 transition-colors border border-border/40 sm:border-transparent"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <TypeTile type={p.projectType} size="sm" className="shrink-0 mt-0.5 sm:mt-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] sm:text-[13.5px] font-semibold text-fg leading-snug break-words">
                          {p.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted break-words">
                          <span className="font-medium text-fg-2">{p.client.clientProfile?.companyName || p.client.name}</span>
                          <span className="mx-1.5 opacity-60">·</span>
                          <span>{timeAgo(p.submittedAt!, locale)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 ps-11 sm:ps-0">
                      <PriorityBadge priority={p.priority} />
                      <StatusBadge status={p.status} short />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="px-3 pb-4 text-sm text-muted">{t('moderation.empty')}</p>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title={t('dashboard.recentActivity')} icon={<Activity className="size-4" />} />
            <div className="px-3 sm:px-5 pb-4 sm:pb-5">
              <ol className="relative min-w-0 space-y-4">
                {overview.data?.recent.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="relative flex items-start gap-3">
                    <div className="relative flex shrink-0 flex-col items-center">
                      {e.actor ? <Avatar name={e.actor.name} size="sm" /> : <div className="size-7 rounded-full bg-surface-3" />}
                      {i < overview.data!.recent.length - 1 && <span className="mt-1.5 w-px h-full min-h-[24px] bg-border" />}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] text-fg leading-snug break-words">
                        <span className="font-semibold text-fg">{e.actor?.name ?? t('chat.system')}</span>
                        <span className="mx-1 text-muted">·</span>
                        <span>{e.title}</span>
                      </p>
                      <Link to={`/app/projects/${e.project.id}`} className="mt-1 block text-xs text-muted hover:text-brand leading-relaxed break-words">
                        <span className="font-mono text-fg-2 font-medium">{e.project.code}</span>
                        <span className="mx-1.5 text-muted/60">—</span>
                        <span>{e.project.title}</span>
                        <span className="mx-1.5 text-muted/60">·</span>
                        <span className="text-muted/80">{timeAgo(e.createdAt, locale)}</span>
                      </Link>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader title={t('dashboard.workload')} icon={<Users className="size-4" />} />
            <div className="space-y-4 px-3 sm:px-5 pb-4 sm:pb-5">
              {overview.data?.workload.map((w) => (
                <div key={w.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={w.name} size="sm" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-fg break-words">{w.name}</p>
                        <p className="text-[11px] text-muted break-words">{w.title ?? t(`roles.${w.role}`)}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-2 bg-surface-2 px-2 py-0.5 rounded-md">
                      {w.activeProjects}/{w.capacity} {t('nav.projects')}
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
