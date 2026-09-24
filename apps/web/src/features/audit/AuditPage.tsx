import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ScrollText, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { BriefUser } from '../../lib/types';
import { cn, formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/form';
import { Card, PageHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState } from '../../components/ui/feedback';

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: BriefUser | null;
}

const tone = (action: string) =>
  /failed|deleted|hide|deactivat/.test(action)
    ? 'bg-danger-soft text-danger'
    : /login|registered/.test(action)
      ? 'bg-info-soft text-info'
      : /settings|workflow|ai\./.test(action)
        ? 'bg-brand-soft text-brand'
        : 'bg-surface-2 text-fg-2';

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const logs = useQuery({
    queryKey: ['audit', page, action],
    queryFn: () => api.get<{ items: AuditRow[]; total: number; pageSize: number }>(`/audit?page=${page}&pageSize=25${action ? `&action=${encodeURIComponent(action)}` : ''}`),
    placeholderData: keepPreviousData,
  });
  const pages = logs.data ? Math.max(1, Math.ceil(logs.data.total / logs.data.pageSize)) : 1;

  return (
    <>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      <div className="mb-5 max-w-sm">
        <Input icon={<Search className="size-4" />} placeholder={t('audit.filter')} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} dir="ltr" />
      </div>
      <Card className="overflow-hidden">
        {!logs.data?.items.length ? (
          <EmptyState icon={<ScrollText className="size-6" />} title={t('audit.title')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">{t('audit.when')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('audit.actor')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('audit.action')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('audit.entity')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('audit.ip')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.data.items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-5 py-3 whitespace-nowrap text-muted tabular-nums">{formatDateTime(l.createdAt, locale)}</td>
                    <td className="px-3 py-3">
                      {l.actor ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={l.actor.name} size="xs" />
                          <span className="truncate">{l.actor.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted">{t('audit.system')}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-md px-2 py-0.5 font-mono text-[11.5px]', tone(l.action))}>{l.action}</span>
                      {l.meta && Object.keys(l.meta).length > 0 && (
                        <pre className="mt-1.5 max-w-md overflow-hidden text-[11px] text-ellipsis whitespace-pre-wrap text-muted" dir="ltr">
                          {JSON.stringify(l.meta).slice(0, 180)}
                        </pre>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11.5px] text-fg-2" dir="ltr">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ''}</td>
                    <td className="px-5 py-3 font-mono text-[11.5px] text-muted" dir="ltr">{l.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
          <span>{logs.data?.total ?? 0}</span>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous"><ChevronLeft className="rtl-flip size-4" /></Button>
            <span className="tabular-nums">{page} / {pages}</span>
            <Button size="icon-sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next"><ChevronRight className="rtl-flip size-4" /></Button>
          </div>
        </div>
      </Card>
    </>
  );
}
