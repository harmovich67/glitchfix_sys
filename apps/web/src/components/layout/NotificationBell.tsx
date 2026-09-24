import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover } from 'radix-ui';
import { Bell, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../lib/api';
import type { Notification } from '../../lib/types';
import { useI18n } from '../../lib/i18n';
import { cn, timeAgo } from '../../lib/utils';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/feedback';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: Notification[]; unread: number }>('/notifications'),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids?: string[]; all?: boolean }) => api.post('/notifications/read', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function NotificationItem({ n, onOpen }: { n: Notification; onOpen?: () => void }) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const markRead = useMarkRead();
  return (
    <button
      onClick={() => {
        if (!n.readAt) markRead.mutate({ ids: [n.id] });
        onOpen?.();
        if (n.link) navigate(n.link);
      }}
      className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-surface-2"
    >
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand shadow-[0_0_0_3px_var(--brand-soft)]')} />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[13px] leading-snug', n.readAt ? 'text-fg-2' : 'font-medium text-fg')}>{n.title}</span>
        {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
        <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.createdAt, locale)}</span>
      </span>
    </button>
  );
}

export function NotificationBell() {
  const { t } = useI18n();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const unread = data?.unread ?? 0;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('nav.notifications')} className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-bg">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[360px] max-w-[calc(100vw-1rem)] rounded-2xl bg-surface shadow-lg ring-1 ring-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{t('notifications.title')}</p>
            {unread > 0 && (
              <button onClick={() => markRead.mutate({ all: true })} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <CheckCheck className="size-3.5" /> {t('notifications.markAll')}
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto p-1.5">
            {data?.items.length ? (
              data.items.slice(0, 12).map((n) => <NotificationItem key={n.id} n={n} />)
            ) : (
              <EmptyState icon={<Bell className="size-6" />} title={t('notifications.empty')} description={t('notifications.emptyBody')} className="py-10" />
            )}
          </div>
          <div className="border-t border-border p-2">
            <Popover.Close asChild>
              <Link to="/app/notifications" className="block rounded-lg py-2 text-center text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg">
                {t('common.viewAll')}
              </Link>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
