import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList, ExternalLink, FileText, OctagonAlert, Pencil, Trash2, X } from 'lucide-react';
import { TASK_STATUSES, type Priority, type TaskStatus, PRIORITIES, tr } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { ProjectDetail, Task } from '../../lib/types';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';
import { TASK_STYLE } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { Field, Input, Select, SegmentedControl, Textarea } from '../../components/ui/form';
import { Badge, PriorityBadge } from '../../components/ui/surfaces';
import { Avatar } from '../../components/ui/feedback';
import { Drawer } from '../../components/ui/overlay';
import { Markdown } from '../../components/ui/markdown';
import { ticketRef, useCanMoveTicket, useUpdateTicket, type TicketPatch } from './useTickets';

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

/** Full ticket detail: status, ownership, blockers, estimate and where the ticket came from. */
export function TicketDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { user, can } = useAuth();
  const update = useUpdateTicket();
  const canMoveFn = useCanMoveTicket();
  const isManager = can('projects.manage');

  const projectQ = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${task!.projectId}`),
    enabled: !!task,
  });
  const project = projectQ.data;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState('');
  const [estimate, setEstimate] = useState('');

  useEffect(() => {
    setEditing(false);
    setBlocking(false);
    setReason('');
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setEstimate(task?.estimateHours != null ? String(task.estimateHours) : '');
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canMove = task ? canMoveFn(task) : false;
  const step = task?.stepKey && project ? project.workflow.steps.find((s) => s.key === task.stepKey) : undefined;
  const team = project?.members.map((m) => m.user) ?? [];
  const isDeveloper = user?.role === 'DEVELOPER';
  const assignees = isDeveloper ? team.filter((u) => u.id === user?.id) : team;
  const patch = (body: TicketPatch) => task && update.mutate({ id: task.id, ...body });

  return (
    <Drawer open={!!task} onOpenChange={(o) => !o && onClose()} title={task?.title ?? ''} width="max-w-xl">
      {task && (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span dir="ltr" className="font-mono text-xs text-muted">{ticketRef(task, project?.code)}</span>
                {task.source === 'REQUIREMENT' && (
                  <Badge className="bg-brand-soft text-brand ring-brand/20">
                    <ClipboardList className="size-3" /> {t('tickets.requirement')}
                  </Badge>
                )}
                <PriorityBadge priority={task.priority} />
              </div>
              {editing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" aria-label={t('common.edit')} />
              ) : (
                <h2 className="mt-1.5 text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{task.title}</h2>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('common.close')}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Field label={t('common.status')} hint={!canMove ? t('tickets.claimHint') : undefined}>
              <div className="overflow-x-auto">
                <SegmentedControl<TaskStatus>
                  size="sm"
                  value={task.status}
                  onChange={(status) => canMove && status !== task.status && patch({ status })}
                  options={TASK_STATUSES.map((s) => ({
                    value: s,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('size-1.5 rounded-full', TASK_STYLE[s])} />
                        {t(`taskStatus.${s}`)}
                      </span>
                    ),
                  }))}
                />
              </div>
            </Field>

            {task.blockedReason ? (
              <div className="rounded-xl bg-danger-soft p-3.5 ring-1 ring-danger/25">
                <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <OctagonAlert className="size-4" /> {t('tickets.blockedBy')}
                </p>
                <p className="mt-1 text-[13px] text-fg-2 [overflow-wrap:anywhere]">{task.blockedReason}</p>
                {canMove && (
                  <Button size="xs" variant="secondary" className="mt-2.5" loading={update.isPending} onClick={() => patch({ blockedReason: null })}>
                    {t('tickets.unblock')}
                  </Button>
                )}
              </div>
            ) : (
              canMove &&
              task.status !== 'DONE' &&
              (blocking ? (
                <div className="space-y-2 rounded-xl bg-surface-2/60 p-3.5 ring-1 ring-border">
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('tickets.blockedReason')} className="min-h-20" maxLength={500} autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button size="xs" variant="ghost" onClick={() => setBlocking(false)}>{t('common.cancel')}</Button>
                    <Button
                      size="xs"
                      variant="danger"
                      disabled={!reason.trim()}
                      loading={update.isPending}
                      onClick={() => {
                        patch({ blockedReason: reason });
                        setBlocking(false);
                      }}
                    >
                      {t('tickets.markBlocked')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="xs" variant="ghost" className="text-danger hover:bg-danger-soft" leftIcon={<OctagonAlert className="size-3.5" />} onClick={() => setBlocking(true)}>
                  {t('tickets.markBlocked')}
                </Button>
              ))
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('workspace.assignee')}>
                <Select
                  value={task.assignee?.id ?? ''}
                  disabled={!project || (isDeveloper && !!task.assignee && task.assignee.id !== user?.id)}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                >
                  <option value="">{t('common.unassigned')}</option>
                  {(assignees.some((u) => u.id === task.assignee?.id) || !task.assignee ? assignees : [...assignees, task.assignee]).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('common.priority')}>
                <Select value={task.priority} disabled={!isManager} onChange={(e) => patch({ priority: e.target.value as Priority })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('tickets.estimate')}>
                <Input
                  type="number"
                  min={0}
                  max={2000}
                  inputMode="numeric"
                  value={estimate}
                  disabled={!canMove}
                  onChange={(e) => setEstimate(e.target.value)}
                  onBlur={() => {
                    const n = estimate === '' ? null : Math.max(0, Math.round(Number(estimate)));
                    if (n !== (task.estimateHours ?? null) && (n === null || Number.isFinite(n))) patch({ estimateHours: n });
                  }}
                />
              </Field>
              <Field label={t('tickets.dueDate')}>
                <Input
                  type="date"
                  value={toDateInput(task.dueDate)}
                  disabled={!isManager}
                  onChange={(e) => patch({ dueDate: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })}
                />
              </Field>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[13px] font-medium text-fg-2">{t('workspace.description')}</p>
                {isManager && !editing && (
                  <Button size="xs" variant="ghost" leftIcon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>{t('tickets.editTicket')}</Button>
                )}
              </div>
              {editing ? (
                <div className="space-y-2">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-40" maxLength={5000} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
                    <Button
                      size="sm"
                      loading={update.isPending}
                      disabled={!title.trim()}
                      onClick={() => {
                        patch({ title: title.trim(), description });
                        setEditing(false);
                      }}
                    >
                      {t('tickets.saveChanges')}
                    </Button>
                  </div>
                </div>
              ) : task.description ? (
                <div className="rounded-xl bg-surface-2/50 p-4 ring-1 ring-border"><Markdown source={task.description} /></div>
              ) : (
                <p className="text-sm text-muted">—</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl bg-surface-2/50 p-4 text-[13px] ring-1 ring-border">
              {task.source === 'REQUIREMENT' && (
                <p className="flex items-center gap-2 text-fg-2">
                  <ClipboardList className="size-4 text-brand" />
                  <span>{t('tickets.group')}: <b className="font-semibold text-fg">{step ? tr(step, 'title', locale) : task.stepKey ?? '—'}</b></span>
                </p>
              )}
              {task.reportId && (
                <Link to={`/app/reports/${task.reportId}`} className="flex items-center gap-2 text-brand hover:underline">
                  <FileText className="size-4" /> {t('tickets.fromReport')}
                </Link>
              )}
              <div className="flex items-center gap-2 text-muted">
                <Avatar name={task.createdBy.name} size="xs" />
                {t('tickets.created_by', { name: task.createdBy.name })} · {timeAgo(task.createdAt, locale)}
              </div>
              {task.startedAt && <p className="text-muted">{t('tickets.started', { time: formatDateTime(task.startedAt, locale) })}</p>}
              {task.completedAt && <p className="text-success">{t('tickets.finished', { time: formatDateTime(task.completedAt, locale) })}</p>}
            </div>
          </div>

          <div className="border-t border-border px-5 py-3">
            <Button asChild variant="secondary" size="sm" rightIcon={<ExternalLink className="size-3.5" />}>
              <Link to={`/app/projects/${task.projectId}?tab=workspace`}>{t('tickets.openProject')}</Link>
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
