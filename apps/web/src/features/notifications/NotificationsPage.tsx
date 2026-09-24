import { Bell, CheckCheck } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, PageHeader } from '../../components/ui/surfaces';
import { EmptyState, Skeleton } from '../../components/ui/feedback';
import { NotificationItem, useMarkRead, useNotifications } from '../../components/layout/NotificationBell';

export default function NotificationsPage() {
  const { t } = useI18n();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        subtitle={data?.unread ? `${data.unread} ${t('notifications.unread').toLowerCase()}` : undefined}
        actions={
          !!data?.unread && (
            <Button variant="secondary" leftIcon={<CheckCheck className="size-4" />} onClick={() => markRead.mutate({ all: true })}>
              {t('notifications.markAll')}
            </Button>
          )
        }
      />
      <Card className="mx-auto max-w-3xl p-2">
        {isLoading ? (
          <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : data?.items.length ? (
          data.items.map((n) => <NotificationItem key={n.id} n={n} />)
        ) : (
          <EmptyState icon={<Bell className="size-6" />} title={t('notifications.empty')} description={t('notifications.emptyBody')} />
        )}
      </Card>
    </>
  );
}
