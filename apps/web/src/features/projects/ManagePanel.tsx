import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarRange, CheckCircle2, Flag, Lock, LockOpen, Trash2, UserPlus, Users, X } from 'lucide-react';
import { PRIORITIES, PROJECT_STATUSES, type Priority, type ProjectStatus } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { AssignableUser, ProjectDetail } from '../../lib/types';
import { cn, formatDate } from '../../lib/utils';
import { STATUS_STYLE } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { Field, Input, SegmentedControl, Select } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Avatar } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/overlay';

const toDateInput = (v: string | null) => (v ? v.slice(0, 10) : '');
const fromDateInput = (v: string) => (v ? new Date(`${v}T12:00:00Z`).toISOString() : null);

function useProjectMutation<T>(projectId: string, fn: (v: T) => Promise<ProjectDetail>) {
  const { t } = useI18n();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (p) => {
      qc.setQueryData(['project', projectId], p);
      qc.invalidateQueries({ queryKey: ['timeline', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('manage.updated'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function ManagePanel({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addUser, setAddUser] = useState('');
  const [addRole, setAddRole] = useState<'MANAGER' | 'DEVELOPER'>('DEVELOPER');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { access } = project;

  const assignable = useQuery({ queryKey: ['assignable'], queryFn: () => api.get<AssignableUser[]>('/users/assignable'), enabled: access.canAssign });

  const update = useProjectMutation(project.id, (body: Record<string, unknown>) => api.patch<ProjectDetail>(`/projects/${project.id}`, body));
  const approve = useProjectMutation(project.id, () => api.post<ProjectDetail>(`/projects/${project.id}/${project.approvedAt ? 'reopen' : 'approve'}`));
  const addMember = useProjectMutation(project.id, () => api.post<ProjectDetail>(`/projects/${project.id}/members`, { userId: addUser, role: addRole }));
  const removeMember = useProjectMutation(project.id, (userId: string) => api.del<ProjectDetail>(`/projects/${project.id}/members/${userId}`));
  const del = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate('/app/projects');
    },
  });

  const current = PROJECT_STATUSES.indexOf(project.status);
  const memberIds = new Set(project.members.map((m) => m.user.id));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        {access.canManage && (
          <Card>
            <CardHeader title={t('manage.status')} icon={<Flag className="size-4" />} />
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4 lg:grid-cols-7">
              {PROJECT_STATUSES.map((s, i) => (
                <button
                  key={s}
                  disabled={update.isPending}
                  onClick={() => s !== project.status && update.mutate({ status: s })}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl p-3 text-start ring-1 transition',
                    s === project.status ? 'bg-brand-soft ring-2 ring-brand' : i < current ? 'bg-surface-2 ring-border' : 'bg-surface ring-border hover:ring-border-strong',
                  )}
                >
                  <span className={cn('size-2 rounded-full', STATUS_STYLE[s as ProjectStatus].dot)} />
                  <span className="text-xs leading-tight font-medium">{t(`status.${s}`)}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {access.canManage && (
          <Card>
            <CardHeader title={t('manage.schedule')} icon={<CalendarRange className="size-4" />} />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
              <Field label={t('manage.priority')}>
                <SegmentedControl
                  size="sm"
                  value={project.priority}
                  onChange={(v: Priority) => update.mutate({ priority: v })}
                  options={PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }))}
                />
              </Field>
              <Field label={t('common.startDate')}>
                <Input type="date" defaultValue={toDateInput(project.startDate)} onBlur={(e) => e.target.value !== toDateInput(project.startDate) && update.mutate({ startDate: fromDateInput(e.target.value) })} />
              </Field>
              <Field label={t('common.dueDate')}>
                <Input type="date" defaultValue={toDateInput(project.dueDate)} onBlur={(e) => e.target.value !== toDateInput(project.dueDate) && update.mutate({ dueDate: fromDateInput(e.target.value) })} />
              </Field>
            </div>
          </Card>
        )}

        {access.canManage && (
          <Card className={cn('p-5', project.approvedAt ? 'bg-success-soft/40' : '')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', project.approvedAt ? 'bg-success text-white' : 'bg-surface-2 text-muted')}>
                {project.approvedAt ? <Lock className="size-5" /> : <CheckCircle2 className="size-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{project.approvedAt ? t('manage.approvedOn', { date: formatDate(project.approvedAt, locale) }) : t('manage.approve')}</p>
                <p className="text-xs text-muted">{t('manage.approveHint')}</p>
              </div>
              <Button
                variant={project.approvedAt ? 'secondary' : 'primary'}
                loading={approve.isPending}
                disabled={!project.submittedAt}
                onClick={() => approve.mutate(undefined)}
                leftIcon={project.approvedAt ? <LockOpen className="size-4" /> : <CheckCircle2 className="size-4" />}
              >
                {project.approvedAt ? t('manage.reopen') : t('manage.approve')}
              </Button>
            </div>
          </Card>
        )}

        {can('projects.delete') && (
          <Card className="p-5 ring-danger/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-danger">{t('manage.dangerZone')}</p>
                <p className="text-xs text-muted">{t('manage.deleteConfirm')}</p>
              </div>
              <Button variant="danger" size="sm" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                {t('manage.deleteProject')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {access.canAssign && (
        <Card className="h-fit">
          <CardHeader title={t('manage.team')} icon={<Users className="size-4" />} />
          <div className="space-y-2 px-5">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                <Avatar name={m.user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{m.user.name}</p>
                  <p className="text-[11px] text-muted">{m.role === 'MANAGER' ? t('manage.asManager') : m.user.developerProfile?.title ?? t('manage.asDeveloper')}</p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => removeMember.mutate(m.user.id)} aria-label={t('common.remove')}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            {!project.members.length && <p className="py-3 text-sm text-muted">{t('common.unassigned')}</p>}
          </div>
          <div className="mt-3 space-y-3 border-t border-border p-5">
            <Select value={addUser} onChange={(e) => setAddUser(e.target.value)}>
              <option value="">{t('manage.addMember')}…</option>
              {assignable.data
                ?.filter((u) => !memberIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.developerProfile?.title ?? t(`roles.${u.role}`)} ({t('manage.load', { n: u.activeProjects })})
                  </option>
                ))}
            </Select>
            <div className="flex gap-2">
              <SegmentedControl
                size="sm"
                value={addRole}
                onChange={setAddRole}
                options={[
                  { value: 'DEVELOPER', label: t('manage.asDeveloper') },
                  { value: 'MANAGER', label: t('manage.asManager') },
                ]}
              />
              <Button className="flex-1" size="sm" disabled={!addUser} loading={addMember.isPending} onClick={() => addMember.mutate(undefined, { onSuccess: () => setAddUser('') })} leftIcon={<UserPlus className="size-4" />}>
                {t('common.add')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('manage.deleteProject')}
        description={t('manage.deleteConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={del.isPending} onClick={() => del.mutate()}>{t('common.delete')}</Button>
          </>
        }
      />
    </div>
  );
}
