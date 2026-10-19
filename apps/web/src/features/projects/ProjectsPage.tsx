import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FolderSearch, Kanban, List, Plus, Search } from 'lucide-react';
import { PRIORITIES, PROJECT_STATUSES } from '@welco/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { ProjectListItem } from '../../lib/types';
import { cn, storage, timeAgo } from '../../lib/utils';
import { STATUS_STYLE } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { Input, SegmentedControl, Select } from '../../components/ui/form';
import { Card, PageHeader, PriorityBadge, StatusBadge } from '../../components/ui/surfaces';
import { AvatarStack, EmptyState, Progress, Skeleton } from '../../components/ui/feedback';
import { DueLabel, ProjectCard, TypeTile } from './components';

export function ProjectsPage() {
  const { t, locale } = useI18n();
  const { isClient } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [kind, setKind] = useState('');
  const [view, setView] = useState<'list' | 'board'>(() => (storage.get('welco.projects.view') as 'list' | 'board') || 'list');

  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (kind) params.set('kind', kind);
  const projects = useQuery({
    queryKey: ['projects', Object.fromEntries(params)],
    queryFn: () => api.get<ProjectListItem[]>(`/projects?${params}`),
    placeholderData: keepPreviousData,
  });

  const setViewPersist = (v: 'list' | 'board') => {
    setView(v);
    storage.set('welco.projects.view', v);
  };

  return (
    <>
      <PageHeader
        title={isClient ? t('projects.clientTitle') : t('projects.title')}
        subtitle={!isClient ? t('projects.subtitle') : undefined}
        actions={
          isClient ? (
            <Button asChild leftIcon={<Plus className="size-4" />}>
              <Link to="/app/new">{t('projects.newProject')}</Link>
            </Button>
          ) : (
            <SegmentedControl
              value={view}
              onChange={setViewPersist}
              options={[
                { value: 'list', label: <span className="flex items-center gap-1.5"><List className="size-3.5" />{t('projects.list')}</span> },
                { value: 'board', label: <span className="flex items-center gap-1.5"><Kanban className="size-3.5" />{t('projects.board')}</span> },
              ]}
            />
          )
        }
      />

      {!isClient && (
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_180px_170px]">
          <Input icon={<Search className="size-4" />} placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('projects.filterStatus')}</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">{t('projects.filterPriority')}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{t(`priority.${p}`)}</option>
            ))}
          </Select>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('fix.filterAll')}</option>
            <option value="NEW">{t('fix.filterNew')}</option>
            <option value="FIX">{t('fix.filterFix')}</option>
          </Select>
        </div>
      )}

      {projects.isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !projects.data?.length ? (
        <Card>
          <EmptyState icon={<FolderSearch className="size-6" />} title={t('projects.empty')} />
        </Card>
      ) : isClient ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((p, i) => <ProjectCard key={p.id} p={p} index={i} clientView />)}
        </div>
      ) : view === 'board' ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
          {PROJECT_STATUSES.map((s) => {
            const items = projects.data.filter((p) => p.status === s);
            return (
              <div key={s} className="w-72 shrink-0">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn('size-2 rounded-full', STATUS_STYLE[s].dot)} />
                  <span className="text-[13px] font-semibold">{t(`status.${s}`)}</span>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="space-y-2.5 rounded-2xl bg-surface-2/60 p-2 ring-1 ring-border min-h-24">
                  {items.map((p) => (
                    <Link key={p.id} to={`/app/projects/${p.id}`} className="block rounded-xl bg-surface p-3.5 shadow-xs ring-1 ring-border transition hover:shadow-md">
                      <div className="flex items-start gap-2.5">
                        <TypeTile type={p.projectType} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{p.title}</p>
                          <p className="truncate text-[11px] text-muted">{p.client.clientProfile?.companyName || p.client.name}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <PriorityBadge priority={p.priority} />
                        {p.members.length > 0 && <AvatarStack names={p.members.map((m) => m.user.name)} size="xs" />}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-start text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-start text-xs font-medium text-muted">
                  <th className="px-5 py-3 text-start font-medium">{t('projects.project')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('common.client')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('common.status')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('common.priority')}</th>
                  <th className="w-40 px-3 py-3 text-start font-medium">{t('projects.progress')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('projects.members')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('common.dueDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.data.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/app/projects/${p.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <TypeTile type={p.projectType} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{p.title}</p>
                          <p className="font-mono text-[11px] text-muted">
                            {p.code} · {p.kind === 'FIX' && <span className="font-sans font-medium text-orange-600 dark:text-orange-300">{t('fix.kindBadge')} · </span>}
                            {timeAgo(p.updatedAt, locale)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="truncate text-[13px]">{p.client.clientProfile?.companyName || p.client.name}</p>
                      <p className="truncate text-[11px] text-muted">{p.client.name}</p>
                    </td>
                    <td className="px-3 py-3.5"><StatusBadge status={p.status} short /></td>
                    <td className="px-3 py-3.5"><PriorityBadge priority={p.priority} /></td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="w-20" />
                        <span className="text-xs tabular-nums text-muted">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">{p.members.length ? <AvatarStack names={p.members.map((m) => m.user.name)} size="xs" /> : <span className="text-xs text-muted">—</span>}</td>
                    <td className="px-5 py-3.5"><DueLabel date={p.dueDate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
