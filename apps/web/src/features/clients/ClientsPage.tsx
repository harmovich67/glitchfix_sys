import { useState } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { User } from '../../lib/types';
import { countryName, flag, formatDate, timeAgo } from '../../lib/utils';
import { Input } from '../../components/ui/form';
import { Card, PageHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/feedback';
import { TypeTile } from '../projects/components';

type ClientRow = User & { projectCount: number; activeCount: number; lastActivityAt: string; projectTypes: string[] };

export default function ClientsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const clients = useQuery({
    queryKey: ['clients', q],
    queryFn: () => api.get<ClientRow[]>(`/clients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('clients.title')} subtitle={t('clients.subtitle')} />
      <div className="mb-5 max-w-md">
        <Input icon={<Search className="size-4" />} placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {clients.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !clients.data?.length ? (
        <Card><EmptyState icon={<Building2 className="size-6" />} title={t('clients.empty')} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">{t('clients.company')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('clients.country')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('clients.projects')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('clients.lastActivity')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('clients.joined')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.data.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/app/clients/${c.id}`)} className="cursor-pointer hover:bg-surface-2/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.clientProfile?.companyName || c.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.clientProfile?.companyName || '—'}</p>
                          <p className="truncate text-xs text-muted">{c.name} · {c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-[13px]">{c.clientProfile?.country ? `${flag(c.clientProfile.country)} ${countryName(c.clientProfile.country, locale)}` : '—'}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">{c.projectCount}</span>
                        <div className="flex -space-x-1.5 rtl:space-x-reverse">
                          {c.projectTypes.slice(0, 3).map((pt) => <TypeTile key={pt} type={pt} size="sm" />)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-muted">{timeAgo(c.lastActivityAt, locale)}</td>
                    <td className="px-5 py-3.5 text-[13px] text-muted">{formatDate(c.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
