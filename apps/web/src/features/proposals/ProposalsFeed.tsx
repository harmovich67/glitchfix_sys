import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, FileSignature } from 'lucide-react';
import { formatMoney } from '@welco/shared';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { PendingProposals } from '../../lib/types';
import { formatDate, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { ProposalStatusBadge } from './ProposalPanel';

type Item = PendingProposals['items'][number];

function Row({ p }: { p: Item }) {
  const { t, locale } = useI18n();
  return (
    <Link to={`/app/projects/${p.project.id}?tab=proposal`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-fg">{p.project.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted">
          <span className="font-mono">{p.project.code}</span>
          <span className="font-semibold tabular-nums text-fg-2">{formatMoney(p.totals.total, p.currency, locale)}</span>
          {p.status === 'SENT' && (
            <span className="inline-flex items-center gap-1">
              {p.viewedAt ? <Eye className="size-3 text-success" /> : <EyeOff className="size-3" />}
              {p.viewedAt ? `${t('proposal.feed.opened')} ${timeAgo(p.viewedAt, locale)}` : t('proposal.feed.notOpened')}
            </span>
          )}
        </span>
      </span>
      <ProposalStatusBadge status={p.status} expired={p.expired} />
      <ArrowRight className="rtl-flip size-4 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Dashboard block: clients see what waits for their approval; managers see offers out, needing a reply, or just approved. */
export function ProposalsFeed() {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ['proposals', 'pending'], queryFn: () => api.get<PendingProposals>('/proposals/pending'), staleTime: 30_000 });
  const data = q.data;
  if (!data?.items.length) return null;

  if (data.audience === 'client')
    return (
      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-brand-soft via-surface to-surface ring-brand/25">
        <CardHeader title={t('proposal.feed.awaitingYou')} icon={<FileSignature className="size-4" />} />
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
          {data.items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{p.project.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{p.project.code}</p>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-bold tabular-nums text-brand">{formatMoney(p.totals.total, p.currency, locale)}</p>
                  {p.validUntil && <p className="text-[11.5px] text-muted">{t('proposal.feed.validFor', { date: formatDate(p.validUntil, locale) })}</p>}
                </div>
                <Button asChild size="sm" rightIcon={<ArrowRight className="rtl-flip size-4" />}>
                  <Link to={`/app/projects/${p.project.id}?tab=proposal`}>{t('proposal.feed.reviewApprove')}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );

  const groups: [string, Item[]][] = [
    [t('proposal.feed.needsReply'), data.items.filter((p) => p.status === 'REVISION_REQUESTED' || p.status === 'DECLINED')],
    [t('proposal.feed.outWithClients'), data.items.filter((p) => p.status === 'SENT')],
    [t('proposal.feed.recentlyApproved'), data.items.filter((p) => p.status === 'ACCEPTED')],
  ];
  return (
    <Card>
      <CardHeader title={t('proposal.feed.title')} icon={<FileSignature className="size-4" />} />
      <div className="space-y-3 px-2 pb-3">
        {groups.filter(([, items]) => items.length).map(([label, items]) => (
          <div key={label}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{label} · {items.length}</p>
            {items.slice(0, 5).map((p) => <Row key={p.id} p={p} />)}
          </div>
        ))}
      </div>
    </Card>
  );
}
