import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NotebookPen, Pin, PinOff, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { Note, ProjectDetail, Task, ThreadsResponse } from '../../lib/types';
import { cn, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input, SegmentedControl, Textarea } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Progress } from '../../components/ui/feedback';
import { Markdown } from '../../components/ui/markdown';
import { ThreadView } from './ThreadView';
import { TaskPlanDialog } from '../tickets/TaskPlanDialog';
import { AssigneeBoard, TicketBoard } from '../tickets/TicketBoard';
import { TicketDrawer } from '../tickets/TicketDrawer';
import { ticketStats, useUpdateTicket } from '../tickets/useTickets';

function TaskBoard({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'status' | 'developer'>('status');
  const tasks = useQuery({ queryKey: ['tasks', project.id], queryFn: () => api.get<Task[]>(`/projects/${project.id}/tasks`) });
  const update = useUpdateTicket();

  const create = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/tasks`, { title: draft }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['tasks', project.id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const list = tasks.data ?? [];
  const stats = ticketStats(list);
  const opened = list.find((x) => x.id === openId) ?? null;

  return (
    <Card>
      <CardHeader
        title={t('workspace.tasks')}
        description={list.length ? t('tickets.progress', { done: stats.done, total: stats.total }) : undefined}
        icon={<NotebookPen className="size-4" />}
        action={
          project.access.canManage ? (
            <Button size="sm" variant="soft" leftIcon={<Sparkles className="size-4" />} onClick={() => setPlanOpen(true)}>
              {t('tickets.fromRequirements')}
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4 px-5 pb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) create.mutate();
          }}
          className="flex w-full max-w-md gap-2"
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('workspace.taskTitle')} className="h-8 text-[13px]" />
          <Button type="submit" size="sm" loading={create.isPending} leftIcon={<Plus className="size-4" />}>
            {t('common.add')}
          </Button>
        </form>
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <div className="w-full max-w-xs flex-1"><Progress value={stats.percent} tone="success" /></div>
            <span className="tabular-nums">{stats.percent}%</span>
            {stats.blocked > 0 && <span className="font-medium text-danger">{t('tickets.blockedCount', { n: stats.blocked })}</span>}
            {stats.overdue > 0 && <span className="font-medium text-warning">{t('tickets.overdue', { n: stats.overdue })}</span>}
            {stats.hours > 0 && <span>{t('tickets.hours', { n: stats.hours })}</span>}
          </div>
        )}
        {project.access.canManage && (
          <SegmentedControl
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'status', label: t('tickets.byStatus') },
              { value: 'developer', label: t('tickets.byDeveloper') },
            ]}
          />
        )}
        {view === 'developer' && project.access.canManage ? (
          <AssigneeBoard
            tasks={list}
            members={project.members.map((m) => m.user)}
            projectCode={project.code}
            onOpen={(x) => setOpenId(x.id)}
            onMove={(id, status) => update.mutate({ id, status })}
            onAssign={(id, assigneeId) => update.mutate({ id, assigneeId })}
          />
        ) : (
          <TicketBoard tasks={list} projectCode={project.code} onOpen={(x) => setOpenId(x.id)} onMove={(id, status) => update.mutate({ id, status })} />
        )}
      </div>
      <TicketDrawer task={opened} onClose={() => setOpenId(null)} />
      {project.access.canManage && <TaskPlanDialog project={project} open={planOpen} onOpenChange={setPlanOpen} />}
    </Card>
  );
}

function NotesPanel({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const notes = useQuery({ queryKey: ['notes', project.id], queryFn: () => api.get<Note[]>(`/projects/${project.id}/notes`) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notes', project.id] });
  const add = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/notes`, { body }),
    onSuccess: () => {
      setBody('');
      invalidate();
    },
  });
  const pin = useMutation({ mutationFn: (n: Note) => api.patch(`/notes/${n.id}`, { pinned: !n.pinned }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/notes/${id}`), onSuccess: invalidate });

  return (
    <Card>
      <CardHeader title={t('workspace.notes')} icon={<NotebookPen className="size-4" />} />
      <div className="space-y-3 px-5 pb-5">
        <div className="rounded-2xl bg-surface-2 p-1.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-brand">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('workspace.notePlaceholder')} className="min-h-20 bg-transparent ring-0 hover:ring-0 focus:ring-0" />
          <div className="flex justify-end p-1">
            <Button size="sm" disabled={!body.trim()} loading={add.isPending} onClick={() => add.mutate()}>
              {t('workspace.addNote')}
            </Button>
          </div>
        </div>
        {notes.data?.length ? (
          notes.data.map((n) => (
            <div key={n.id} className={cn('group rounded-2xl p-4 ring-1', n.pinned ? 'bg-warning-soft/50 ring-warning/25' : 'bg-surface ring-border')}>
              <div className="mb-2 flex items-center gap-2">
                <Avatar name={n.author.name} size="xs" />
                <span className="text-xs font-medium">{n.author.name}</span>
                <span className="text-[11px] text-muted">{timeAgo(n.createdAt, locale)}</span>
                <span className="flex-1" />
                <button onClick={() => pin.mutate(n)} className="rounded p-1 text-muted hover:text-fg" aria-label={n.pinned ? t('workspace.unpin') : t('workspace.pin')}>
                  {n.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </button>
                {(n.author.id === user?.id || project.access.canManage) && (
                  <button onClick={() => remove.mutate(n.id)} className="rounded p-1 text-muted opacity-0 hover:text-danger group-hover:opacity-100" aria-label={t('common.delete')}>
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <Markdown source={n.body} />
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted">{t('workspace.emptyNotes')}</p>
        )}
      </div>
    </Card>
  );
}

export function WorkspacePanel({ project, threads }: { project: ProjectDetail; threads?: ThreadsResponse }) {
  const { t } = useI18n();
  const internal = threads?.threads.find((th) => th.type === 'INTERNAL');
  return (
    <div className="space-y-6">
      <TaskBoard project={project} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          {internal ? (
            <ThreadView thread={internal} projectId={project.id} canModerate={!!threads?.canModerate} canResolve />
          ) : (
            <EmptyState title={t('chat.internalThread')} />
          )}
        </Card>
        <NotesPanel project={project} />
      </div>
    </div>
  );
}
