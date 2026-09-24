import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TASK_STATUSES, type TaskStatus } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { AwayItem, Task } from '../../lib/types';

export type TicketPatch = {
  status?: TaskStatus;
  priority?: string;
  assigneeId?: string | null;
  title?: string;
  description?: string;
  dueDate?: string | null;
  estimateHours?: number | null;
  blockedReason?: string | null;
};

/** `WLC-1001-07` — the project code plus the per-project ticket number (legacy tasks have no number). */
export function ticketRef(task: Pick<Task, 'number' | 'project'>, projectCode?: string) {
  const code = task.project?.code ?? projectCode;
  return task.number > 0 && code ? `${code}-${String(task.number).padStart(2, '0')}` : (code ?? '');
}

/** Ids of team members on approved leave today, so managers do not hand them work. */
export function useOnLeaveToday() {
  const { isStaff } = useAuth();
  const away = useQuery({ queryKey: ['timeoff', 'away'], queryFn: () => api.get<AwayItem[]>('/time-off/away'), enabled: isStaff, staleTime: 5 * 60_000 });
  const today = new Date().toISOString().slice(0, 10);
  return new Set((away.data ?? []).filter((a) => a.startDate.slice(0, 10) <= today && a.endDate.slice(0, 10) >= today).map((a) => a.user.id));
}

export const nextStatus = (status: TaskStatus): TaskStatus | null => TASK_STATUSES[TASK_STATUSES.indexOf(status) + 1] ?? null;

/** Developers move their own (or unclaimed) tickets; managers move anything. Mirrors the API rule. */
export function useCanMoveTicket() {
  const { user } = useAuth();
  return (task: Pick<Task, 'assignee'>) => user?.role !== 'DEVELOPER' || !task.assignee || task.assignee.id === user.id;
}

/** Patches a ticket; a status change is applied instantly on every cached board and rolled back on failure. */
export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & TicketPatch) => api.patch<Task>(`/tasks/${id}`, body),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      if (status)
        qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => (Array.isArray(old) ? old.map((x) => (x.id === id ? { ...x, status } : x)) : old));
      return { snapshots };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(errorMessage(e));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export interface TicketStats {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  hours: number;
  percent: number;
}

export function ticketStats(tasks: Task[]): TicketStats {
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const open = tasks.filter((t) => t.status !== 'DONE');
  return {
    total: tasks.length,
    done,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    blocked: open.filter((t) => t.blockedReason).length,
    overdue: open.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now()).length,
    hours: tasks.reduce((n, t) => n + (t.estimateHours ?? 0), 0),
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
