import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { AssignableUser, BriefUser, TechnicalReportDetail } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/form';
import { Badge } from '../../components/ui/surfaces';
import { Avatar, Skeleton } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/overlay';

/** Pick colleagues to receive the report; they are notified and find it in their dashboard. */
export function ShareReportDialog({
  report,
  members,
  open,
  onOpenChange,
}: {
  report: TechnicalReportDetail;
  members: BriefUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const people = useQuery({ queryKey: ['assignable'], queryFn: () => api.get<AssignableUser[]>('/users/assignable'), enabled: open });
  useEffect(() => {
    if (open) setPicked(new Set());
  }, [open]);

  const has = new Set(report.shares.map((s) => s.recipient.id));
  const memberIds = new Set(members.map((m) => m.id));
  const candidates = (people.data ?? []).filter((u) => u.id !== user?.id && u.role === 'DEVELOPER');
  const team = candidates.filter((u) => memberIds.has(u.id));
  const others = candidates.filter((u) => !memberIds.has(u.id));

  const send = useMutation({
    mutationFn: () => api.post<TechnicalReportDetail>(`/ai/projects/${report.projectId}/technical-reports/${report.id}/share`, { userIds: [...picked] }),
    onSuccess: (data) => {
      qc.setQueryData(['report', report.id], data);
      qc.invalidateQueries({ queryKey: ['reports', report.projectId] });
      toast.success(t('report.shareDone'));
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const row = (u: AssignableUser) => {
    const already = has.has(u.id);
    return (
      <li key={u.id}>
        <label
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors',
            already ? 'cursor-default bg-surface-2/50 ring-border' : 'cursor-pointer ring-border hover:bg-surface-2/60',
            picked.has(u.id) && 'bg-brand-soft/40 ring-brand/30',
          )}
        >
          <Checkbox checked={already || picked.has(u.id)} onCheckedChange={() => !already && toggle(u.id)} className={already ? 'pointer-events-none opacity-60' : ''} />
          <Avatar name={u.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{u.name}</span>
            <span className="block truncate text-xs text-muted">{u.developerProfile?.title ?? t(`roles.${u.role}`)}</span>
          </span>
          {already && <Badge className="bg-success-soft text-success ring-success/20">{t('report.alreadyShared')}</Badge>}
        </label>
      </li>
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('report.shareTitle')}
      description={t('report.shareBody')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button disabled={!picked.size} loading={send.isPending} leftIcon={<Send className="rtl-flip size-4" />} onClick={() => send.mutate()}>
            {t('report.sendTo', { n: picked.size })}
          </Button>
        </>
      }
    >
      {people.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <div className="max-h-[52vh] space-y-5 overflow-y-auto pe-1">
          {team.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('report.shareTeam')}</p>
              <ul className="space-y-1.5">{team.map(row)}</ul>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('report.shareOthers')}</p>
              <ul className="space-y-1.5">{others.map(row)}</ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
