import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, CircleHelp, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { DEV_CLIENT_MODES, type PlatformSettings } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { Message } from '../../lib/types';
import { cn, formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { SegmentedControl } from '../../components/ui/form';
import { Badge, Card, PageHeader } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/feedback';
import { Tabs } from '../../components/ui/tabs';

type Row = Message & { thread: { id: string; type: 'CLIENT' | 'INTERNAL'; project: { id: string; code: string; title: string } } };
type Filter = 'PENDING' | 'HIDDEN' | 'ALL';

export default function ModerationPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('PENDING');
  const data = useQuery({
    queryKey: ['moderation', filter],
    queryFn: () => api.get<{ items: Row[]; counts: { pending: number; hidden: number } }>(`/moderation${filter === 'ALL' ? '' : `?status=${filter}`}`),
  });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<PlatformSettings>('/settings') });

  const moderate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/messages/${id}/moderate`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const saveMode = useMutation({
    mutationFn: (mode: PlatformSettings['developerClientMode']) => api.put<PlatformSettings>('/settings', { ...settings.data!, developerClientMode: mode }),
    onSuccess: (s) => qc.setQueryData(['settings'], s),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const counts = data.data?.counts;
  return (
    <>
      <PageHeader title={t('moderation.title')} subtitle={t('moderation.subtitle')} />

      {settings.data && (
        <Card className="mb-6 flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><ShieldCheck className="size-5" /></div>
            <div>
              <p className="text-sm font-semibold">{t('moderation.mode')}</p>
              <p className="text-xs text-muted">{t(`moderation.modeHint.${settings.data.developerClientMode}`)}</p>
            </div>
          </div>
          {can('settings.manage') ? (
            <SegmentedControl
              value={settings.data.developerClientMode}
              onChange={(v) => saveMode.mutate(v)}
              options={DEV_CLIENT_MODES.map((m) => ({ value: m, label: t(`moderation.modes.${m}`) }))}
            />
          ) : (
            <Badge>{t(`moderation.modes.${settings.data.developerClientMode}`)}</Badge>
          )}
        </Card>
      )}

      <Tabs
        className="mb-5"
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'PENDING', label: t('moderation.pending'), badge: counts?.pending ? <span className="rounded-full bg-warning px-1.5 text-[10px] font-semibold text-white">{counts.pending}</span> : undefined },
          { value: 'HIDDEN', label: t('moderation.hidden'), badge: counts?.hidden ? <span className="text-xs text-muted">{counts.hidden}</span> : undefined },
          { value: 'ALL', label: t('moderation.all') },
        ]}
      />

      {data.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : !data.data?.items.length ? (
        <Card><EmptyState icon={<CheckCircle2 className="size-6" />} title={t('moderation.empty')} /></Card>
      ) : (
        <div className="space-y-3">
          {data.data.items.map((m) => (
            <Card key={m.id} className={cn('p-5', m.status === 'PENDING' && 'ring-warning/40')}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Avatar name={m.author?.name ?? '?'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-fg">{m.author?.name}</span>
                    {m.author && <Badge>{t(`roles.${m.author.role}`)}</Badge>}
                    <span>→</span>
                    <Link to={`/app/projects/${m.thread.project.id}?tab=${m.thread.type === 'CLIENT' ? 'conversation' : 'workspace'}`} className="font-mono hover:text-brand">
                      {m.thread.project.code}
                    </Link>
                    <Badge className={m.thread.type === 'INTERNAL' ? undefined : 'bg-info-soft text-info ring-info/20'}>
                      {m.thread.type === 'CLIENT' ? t('chat.clientThread') : t('chat.internalThread')}
                    </Badge>
                    <span>{formatDateTime(m.createdAt, locale)}</span>
                  </div>
                  {m.kind === 'CLARIFICATION' && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning"><CircleHelp className="size-3.5" />{t('chat.clarification')}</p>}
                  <p className={cn('mt-2 text-sm leading-relaxed whitespace-pre-wrap', m.status === 'HIDDEN' && 'text-muted line-through')}>{m.body}</p>
                  {m.moderatedBy && <p className="mt-2 text-[11px] text-muted">{m.moderatedBy.name} · {m.moderatedAt && formatDateTime(m.moderatedAt, locale)}</p>}
                </div>
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  {m.status === 'PENDING' && <Button size="sm" leftIcon={<CheckCircle2 className="size-4" />} onClick={() => moderate.mutate({ id: m.id, action: 'approve' })}>{t('chat.approve')}</Button>}
                  {m.status !== 'HIDDEN' ? (
                    <Button size="sm" variant="secondary" leftIcon={<EyeOff className="size-4" />} onClick={() => moderate.mutate({ id: m.id, action: 'hide' })}>{t('chat.hide')}</Button>
                  ) : (
                    <Button size="sm" variant="secondary" leftIcon={<Eye className="size-4" />} onClick={() => moderate.mutate({ id: m.id, action: 'unhide' })}>{t('chat.unhide')}</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
