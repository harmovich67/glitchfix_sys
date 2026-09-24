import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { MoreHorizontal, NotebookPen, Pin, PinOff, Plus, Trash2, UserRound } from 'lucide-react';
import { TASK_STATUSES, type TaskStatus } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { Note, ProjectDetail, Task, ThreadsResponse } from '../../lib/types';
import { cn, timeAgo } from '../../lib/utils';
import { TASK_STYLE } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { Input, Textarea } from '../../components/ui/form';
import { Card, CardHeader, PriorityBadge } from '../../components/ui/surfaces';
import { Avatar, EmptyState } from '../../components/ui/feedback';
import { Menu } from '../../components/ui/overlay';
import { Markdown } from '../../components/ui/markdown';
import { DueLabel } from './components';
import { ThreadView } from './ThreadView';

function TaskBoard({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const tasks = useQuery({ queryKey: ['tasks', project.id], queryFn: () => api.get<Task[]>(`/projects/${project.id}/tasks`) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', project.id] });

  const create = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/tasks`, { title: draft }),
    onSuccess: () => {
      setDraft('');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: TaskStatus; assigneeId?: string | null }) => api.patch(`/tasks/${id}`, body),
    onMutate: async ({ id, status }) => {
      if (!status) return;
      qc.setQueryData<Task[]>(['tasks', project.id], (old) => old?.map((x) => (x.id === id ? { ...x, status } : x)));
    },
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/tasks/${id}`), onSuccess: invalidate });
  const team = project.members.map((m) => m.user);

  return (
    <Card>
      <CardHeader
        title={t('workspace.tasks')}
        icon={<NotebookPen className="size-4" />}
        action={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) create.mutate();
            }}
            className="flex w-full max-w-sm gap-2"
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('workspace.taskTitle')} className="h-8 text-[13px]" />
            <Button type="submit" size="sm" loading={create.isPending} leftIcon={<Plus className="size-4" />}>
              {t('common.add')}
            </Button>
          </form>
        }
      />
      <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const items = tasks.data?.filter((x) => x.status === status) ?? [];
          return (
            <div
              key={status}
              className="min-h-40 rounded-2xl bg-surface-2/60 p-2 ring-1 ring-border"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/task');
                if (id) update.mutate({ id, status });
              }}
            >
              <div className="mb-2 flex items-center gap-2 px-1.5 pt-1">
                <span className={cn('size-2 rounded-full', TASK_STYLE[status])} />
                <span className="text-xs font-semibold">{t(`taskStatus.${status}`)}</span>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                    >
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/task', task.id)}
                        className="cursor-grab rounded-xl bg-surface p-3 shadow-xs ring-1 ring-border active:cursor-grabbing"
                      >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-[13px] font-medium', task.status === 'DONE' && 'text-muted line-through')}>{task.title}</p>
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <button className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label={t('common.actions')}>
                              <MoreHorizontal className="size-4" />
                            </button>
                          </Menu.Trigger>
                          <Menu.Content>
                            <Menu.Label>{t('common.status')}</Menu.Label>
                            {TASK_STATUSES.map((s) => (
                              <Menu.Item key={s} onSelect={() => update.mutate({ id: task.id, status: s })}>
                                <span className={cn('size-2 rounded-full', TASK_STYLE[s])} /> {t(`taskStatus.${s}`)}
                              </Menu.Item>
                            ))}
                            <Menu.Separator />
                            <Menu.Label>{t('workspace.assignee')}</Menu.Label>
                            {team.map((u) => (
                              <Menu.Item key={u.id} icon={<UserRound />} onSelect={() => update.mutate({ id: task.id, assigneeId: u.id })}>
                                {u.name}
                              </Menu.Item>
                            ))}
                            <Menu.Item onSelect={() => update.mutate({ id: task.id, assigneeId: null })}>{t('common.unassigned')}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Item danger icon={<Trash2 />} onSelect={() => remove.mutate(task.id)}>
                              {t('common.delete')}
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Root>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <PriorityBadge priority={task.priority} />
                        <div className="flex items-center gap-2">
                          {task.status !== 'DONE' && <DueLabel date={task.dueDate} />}
                          {task.assignee && <Avatar name={task.assignee.name} size="xs" />}
                        </div>
                      </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!items.length && <p className="px-2 py-4 text-center text-[11px] text-muted">{t('workspace.emptyTasks')}</p>}
              </div>
            </div>
          );
        })}
      </div>
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
