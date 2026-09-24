import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CheckCircle2, Eye, FileText, Flag, History, ListChecks, Lock, PlayCircle, Send, Sparkles, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { ProjectEvent } from '../../lib/types';
import { cn, formatDateTime } from '../../lib/utils';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Skeleton } from '../../components/ui/feedback';

const ICON: Record<string, React.ReactNode> = {
  created: <PlayCircle />,
  submitted: <Send className="rtl-flip" />,
  status: <Flag />,
  assigned: <UserPlus />,
  approved: <CheckCircle2 />,
  reopened: <Lock />,
  preview: <Eye />,
  brief: <Sparkles />,
  technical_report: <FileText />,
  task: <ListChecks />,
};

export function Timeline({ projectId }: { projectId: string }) {
  const { t, locale } = useI18n();
  const events = useQuery({ queryKey: ['timeline', projectId], queryFn: () => api.get<ProjectEvent[]>(`/projects/${projectId}/timeline`) });
  return (
    <Card>
      <CardHeader title={t('hub.timeline')} icon={<History className="size-4" />} />
      <div className="px-5 pb-5">
        {events.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <ol>
            {events.data?.map((e, i) => {
              const status = e.type === 'status' ? (e.meta?.to as string | undefined) : undefined;
              return (
                <motion.li key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < events.data.length - 1 && <span className="absolute start-[13px] top-8 bottom-0 w-px bg-border" />}
                  <span
                    className={cn(
                      'relative flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface [&>svg]:size-3.5',
                      i === 0 ? 'bg-brand text-white' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {ICON[e.type] ?? <History />}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] font-medium text-fg">
                      {status ? `${t('common.status')}: ${t(`status.${status}`)}` : e.title}
                      {e.visibility === 'INTERNAL' && <span className="ms-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">{t('files.internal')}</span>}
                    </p>
                    {e.body && <p className="mt-0.5 text-xs text-muted">{e.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted">
                      {e.actor?.name ? `${e.actor.name} · ` : ''}
                      {formatDateTime(e.createdAt, locale)}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
