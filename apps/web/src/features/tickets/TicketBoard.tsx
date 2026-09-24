import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarOff, ClipboardList, Clock3, OctagonAlert, UserRound } from 'lucide-react';
import { TASK_STATUSES, type TaskStatus } from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import type { BriefUser, Task } from '../../lib/types';
import { cn } from '../../lib/utils';
import { TASK_STYLE } from '../../lib/meta';
import { PriorityBadge } from '../../components/ui/surfaces';
import { Avatar, Progress } from '../../components/ui/feedback';
import { DueLabel } from '../projects/components';
import { nextStatus, ticketRef, useCanMoveTicket, useOnLeaveToday } from './useTickets';

const COLUMN_TINT: Record<TaskStatus, string> = {
  TODO: 'from-slate-500/[0.07]',
  IN_PROGRESS: 'from-indigo-500/[0.09]',
  REVIEW: 'from-amber-500/[0.09]',
  DONE: 'from-emerald-500/[0.09]',
};

export function TicketCard({
  task,
  projectCode,
  showProject,
  onOpen,
  onMove,
}: {
  task: Task;
  projectCode?: string;
  showProject?: boolean;
  onOpen: (task: Task) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const { t } = useI18n();
  const canMove = useCanMoveTicket()(task);
  const next = nextStatus(task.status);
  const ref = ticketRef(task, projectCode);

  return (
    <div
      draggable={canMove}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'group relative rounded-xl bg-surface p-3 shadow-xs ring-1 ring-border transition-shadow hover:shadow-md',
        canMove ? 'cursor-grab active:cursor-grabbing' : 'opacity-90',
        task.blockedReason && 'ring-danger/40',
      )}
    >
      {task.blockedReason && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-danger" />}
      <div className="flex items-center gap-2">
        <span dir="ltr" className="truncate font-mono text-[10.5px] text-muted">{ref}</span>
        {task.source === 'REQUIREMENT' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
            <ClipboardList className="size-3" /> {t('tickets.requirement')}
          </span>
        )}
        <span className="flex-1" />
        {next && canMove && (
          <button
            type="button"
            onClick={() => onMove(task.id, next)}
            title={`${t('tickets.moveTo')}: ${t(`taskStatus.${next}`)}`}
            aria-label={`${t('tickets.moveTo')}: ${t(`taskStatus.${next}`)}`}
            className="flex size-6 items-center justify-center rounded-md text-muted opacity-70 transition hover:bg-brand-soft hover:text-brand focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ArrowRight className="rtl-flip size-3.5" />
          </button>
        )}
      </div>

      <button type="button" onClick={() => onOpen(task)} className="mt-1.5 block w-full text-start">
        <span className={cn('block text-[13px] font-medium leading-snug [overflow-wrap:anywhere]', task.status === 'DONE' && 'text-muted line-through')}>{task.title}</span>
      </button>

      {showProject && task.project && <p className="mt-1 truncate text-[11px] text-muted">{task.project.title}</p>}

      {task.blockedReason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger-soft px-2 py-1.5 text-[11.5px] leading-snug text-danger">
          <OctagonAlert className="mt-px size-3.5 shrink-0" />
          <span className="[overflow-wrap:anywhere]">{task.blockedReason}</span>
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {task.estimateHours != null && task.estimateHours > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock3 className="size-3" /> {t('tickets.hours', { n: task.estimateHours })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status !== 'DONE' && <DueLabel date={task.dueDate} />}
          {task.assignee ? <Avatar name={task.assignee.name} size="xs" /> : <span className="size-5 rounded-full border border-dashed border-border-strong" title={t('common.unassigned')} />}
        </div>
      </div>
    </div>
  );
}

/** Four-column ticket board: drag between columns, or use the arrow / drawer on touch screens. */
export function TicketBoard({
  tasks,
  projectCode,
  showProject,
  onOpen,
  onMove,
}: {
  tasks: Task[];
  projectCode?: string;
  showProject?: boolean;
  onOpen: (task: Task) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const { t } = useI18n();
  const [over, setOver] = useState<TaskStatus | null>(null);
  const canMove = useCanMoveTicket();

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const items = tasks.filter((x) => x.status === status);
        return (
          <div
            key={status}
            className={cn(
              'min-h-40 min-w-0 rounded-2xl bg-gradient-to-b to-transparent p-2 ring-1 ring-border transition-colors',
              COLUMN_TINT[status],
              over === status && 'bg-brand-soft/40 ring-brand/50',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={(e) => {
              setOver(null);
              const id = e.dataTransfer.getData('text/task');
              const task = tasks.find((x) => x.id === id);
              if (task && task.status !== status && canMove(task)) onMove(id, status);
            }}
          >
            <div className="mb-2 flex items-center gap-2 px-1.5 pt-1">
              <span className={cn('size-2 rounded-full', TASK_STYLE[status])} />
              <span className="text-xs font-semibold">{t(`taskStatus.${status}`)}</span>
              <span className="rounded-full bg-surface px-1.5 text-[11px] font-medium tabular-nums text-muted ring-1 ring-border">{items.length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <TicketCard task={task} projectCode={projectCode} showProject={showProject} onOpen={onOpen} onMove={onMove} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {!items.length && <p className="px-2 py-6 text-center text-[11px] text-muted">{t('tickets.emptyColumn')}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Manager view: one lane per developer. Drop a ticket on a lane to give it to that person; the lane
 * header shows their open workload and whether they are away.
 */
export function AssigneeBoard({
  tasks,
  members,
  projectCode,
  onOpen,
  onMove,
  onAssign,
}: {
  tasks: Task[];
  members: BriefUser[];
  projectCode?: string;
  onOpen: (task: Task) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onAssign: (id: string, assigneeId: string | null) => void;
}) {
  const { t } = useI18n();
  const [over, setOver] = useState<string | null>(null);
  const onLeave = useOnLeaveToday();
  const known = new Set(members.map((m) => m.id));
  // A ticket may belong to someone no longer on the team; still give them a lane so nothing disappears.
  const extra = tasks.flatMap((x) => (x.assignee && !known.has(x.assignee.id) ? [x.assignee] : []));
  const lanes: { id: string; user: BriefUser | null }[] = [
    { id: '', user: null },
    ...[...members, ...extra.filter((u, i) => extra.findIndex((y) => y.id === u.id) === i)].map((u) => ({ id: u.id, user: u })),
  ];
  const order = (x: Task) => TASK_STATUSES.indexOf(x.status);

  return (
    <div className="chic-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {lanes.map((lane) => {
        const items = tasks.filter((x) => (x.assignee?.id ?? '') === lane.id).sort((a, b) => order(a) - order(b));
        const open = items.filter((x) => x.status !== 'DONE');
        const hours = open.reduce((n, x) => n + (x.estimateHours ?? 0), 0);
        return (
          <div
            key={lane.id || 'none'}
            className={cn(
              'min-h-40 w-[280px] shrink-0 rounded-2xl bg-surface-2/50 p-2 ring-1 ring-border transition-colors sm:flex-1 sm:basis-[240px]',
              over === lane.id && 'bg-brand-soft/40 ring-brand/50',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(lane.id);
            }}
            onDragLeave={() => setOver((s) => (s === lane.id ? null : s))}
            onDrop={(e) => {
              setOver(null);
              const id = e.dataTransfer.getData('text/task');
              const task = tasks.find((x) => x.id === id);
              if (task && (task.assignee?.id ?? '') !== lane.id) onAssign(id, lane.id || null);
            }}
          >
            <div className="mb-2 space-y-1.5 px-1.5 pt-1">
              <div className="flex items-center gap-2">
                {lane.user ? (
                  <Avatar name={lane.user.name} size="sm" />
                ) : (
                  <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-border-strong text-muted"><UserRound className="size-3.5" /></span>
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{lane.user?.name ?? t('common.unassigned')}</span>
                {lane.user && onLeave.has(lane.user.id) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                    <CalendarOff className="size-3" />{t('tickets.onLeave')}
                  </span>
                )}
              </div>
              <p className="text-[11px] tabular-nums text-muted">{t('tickets.workload', { n: open.length, h: hours })}</p>
              {items.length > 0 && <Progress value={((items.length - open.length) / items.length) * 100} tone="success" />}
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <TicketCard key={task.id} task={task} projectCode={projectCode} onOpen={onOpen} onMove={onMove} />
              ))}
              {!items.length && <p className="px-2 py-6 text-center text-[11px] text-muted">{t('tickets.dropToAssign')}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
