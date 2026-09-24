import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, MessageSquareText, PartyPopper, PenLine, XCircle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { ProposalDetail } from '../../lib/types';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Checkbox, Field, Input, Textarea } from '../../components/ui/form';
import { Modal } from '../../components/ui/overlay';

/** What the client sees under the proposal: approve with a typed signature, ask for changes, or decline. */
export function ClientDecision({ proposal, latestId }: { proposal: ProposalDetail; latestId?: string }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [dialog, setDialog] = useState<'changes' | 'decline' | null>(null);
  const [note, setNote] = useState('');
  const base = `/projects/${proposal.projectId}/proposals/${proposal.id}`;

  const refresh = () => {
    for (const key of [['proposals'], ['project', proposal.projectId], ['projects'], ['timeline', proposal.projectId], ['notifications']]) qc.invalidateQueries({ queryKey: key });
  };

  const accept = useMutation({
    mutationFn: () => api.post(`${base}/accept`, { signerName: name.trim(), agree: true }),
    onSuccess: () => {
      toast.success(t('proposal.decision.ok'));
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const respond = useMutation({
    mutationFn: (action: 'REQUEST_CHANGES' | 'DECLINE') => api.post(`${base}/respond`, { action, note }),
    onSuccess: () => {
      toast.success(t('proposal.decision.sentOk'));
      setDialog(null);
      setNote('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const box = 'rounded-2xl p-5 ring-1';
  const askUs = (
    <Link to={`/app/projects/${proposal.projectId}?tab=conversation`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline">
      <MessageSquareText className="size-4" /> {t('proposal.decision.askUs')}
    </Link>
  );

  if (proposal.status === 'ACCEPTED')
    return (
      <div className={`${box} bg-success-soft ring-success/25`}>
        <p className="flex items-center gap-2 text-[16px] font-bold text-success"><PartyPopper className="size-5" /> {t('proposal.decision.approvedTitle')}</p>
        <p className="mt-1.5 text-sm text-fg-2">{t('proposal.decision.approvedBody', { name: proposal.acceptedByName ?? '', date: formatDate(proposal.respondedAt, locale) })}</p>
      </div>
    );
  if (proposal.status === 'REVISION_REQUESTED')
    return (
      <div className={`${box} bg-warning-soft ring-warning/25`}>
        <p className="text-sm text-fg-2">{t('proposal.decision.changesSent', { note: proposal.responseNote ?? '' })}</p>
        <div className="mt-3">{askUs}</div>
      </div>
    );
  if (proposal.status === 'DECLINED')
    return (
      <div className={`${box} bg-surface ring-border`}>
        <p className="flex items-center gap-2 text-sm text-fg-2"><XCircle className="size-4 text-muted" /> {t('proposal.decision.declinedMsg')}</p>
        <div className="mt-3">{askUs}</div>
      </div>
    );
  if (proposal.status === 'SUPERSEDED')
    return (
      <div className={`${box} bg-info-soft ring-info/25`}>
        <p className="text-sm text-fg-2">{t('proposal.decision.superseded')}</p>
        {latestId && latestId !== proposal.id && <p className="mt-2 text-[13px] font-medium text-brand">{t('proposal.decision.viewLatest')} ↑</p>}
      </div>
    );
  if (proposal.status !== 'SENT') return null;
  if (proposal.expired)
    return (
      <div className={`${box} bg-danger-soft ring-danger/25`}>
        <p className="text-sm text-fg-2">{t('proposal.decision.expired')}</p>
        <div className="mt-3">{askUs}</div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[18px] font-bold">{t('proposal.decision.readyTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{t('proposal.decision.readyBody')}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3.5 ring-1 ring-border">
        <Checkbox checked={agree} onCheckedChange={setAgree} className="mt-0.5" />
        <span className="text-[13.5px] leading-relaxed text-fg-2">{t('proposal.decision.agree')}</span>
      </label>
      <Field label={t('proposal.decision.signAs')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} icon={<PenLine className="size-4" />} maxLength={80} autoComplete="name" />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" disabled={!agree || name.trim().length < 2} loading={accept.isPending} leftIcon={<CheckCircle2 className="size-5" />} onClick={() => accept.mutate()}>
          {t('proposal.decision.approve')}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setDialog('changes')}>{t('proposal.decision.requestChanges')}</Button>
        <Button variant="ghost" size="lg" className="text-muted" onClick={() => setDialog('decline')}>{t('proposal.decision.decline')}</Button>
      </div>
      <div>{askUs}</div>

      <Modal
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        size="sm"
        title={dialog === 'changes' ? t('proposal.decision.changesTitle') : t('proposal.decision.declineTitle')}
        description={dialog === 'decline' ? t('proposal.decision.declineHint') : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t('common.cancel')}</Button>
            <Button
              variant={dialog === 'decline' ? 'danger' : 'primary'}
              disabled={dialog === 'changes' && note.trim().length < 3}
              loading={respond.isPending}
              onClick={() => respond.mutate(dialog === 'changes' ? 'REQUEST_CHANGES' : 'DECLINE')}
            >
              {t('proposal.decision.submit')}
            </Button>
          </>
        }
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-28" placeholder={dialog === 'changes' ? t('proposal.decision.changesPlaceholder') : ''} autoFocus />
      </Modal>
    </div>
  );
}
