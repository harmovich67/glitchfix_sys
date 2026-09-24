import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { SharedReportItem } from '../../lib/types';
import { timeAgo } from '../../lib/utils';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Avatar } from '../../components/ui/feedback';

/** Dashboard inbox: technical reports colleagues sent to the signed-in user. Hidden until there is one. */
export function SharedReportsCard() {
  const { t, locale } = useI18n();
  const shared = useQuery({ queryKey: ['reports', 'shared'], queryFn: () => api.get<SharedReportItem[]>('/ai/technical-reports/shared') });
  if (!shared.data?.length) return null;

  return (
    <Card>
      <CardHeader title={t('report.sharedInbox')} icon={<FileText className="size-4" />} />
      <div className="space-y-1 px-2 pb-2">
        {shared.data.slice(0, 5).map((s) => (
          <Link key={s.shareId} to={`/app/reports/${s.report.id}`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-[11px] font-bold text-white">v{s.report.version}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-fg">{s.report.project.title}</span>
              <span className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                <Avatar name={s.sharedBy.name} size="xs" />
                {t('report.sharedBy', { name: s.sharedBy.name })} · {timeAgo(s.sharedAt, locale)}
              </span>
            </span>
            <ArrowRight className="rtl-flip size-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
