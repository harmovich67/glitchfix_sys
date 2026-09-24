import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, Check } from 'lucide-react';
import { PROJECT_STATUSES, type ProjectStatus } from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import { cn, daysUntil, formatDate, timeAgo } from '../../lib/utils';
import { DynamicIcon } from '../../lib/icons';
import { TYPE_GRADIENT, TYPE_ICON } from '../../lib/meta';
import type { ProjectListItem } from '../../lib/types';
import { Card, PriorityBadge, StatusBadge } from '../../components/ui/surfaces';
import { AvatarStack, Progress } from '../../components/ui/feedback';
import { Button } from '../../components/ui/button';

export function TypeTile({ type, size = 'md', className }: { type: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'size-8 rounded-lg [&>svg]:size-4', md: 'size-10 rounded-xl [&>svg]:size-5', lg: 'size-14 rounded-2xl [&>svg]:size-7' };
  return (
    <div className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-md', TYPE_GRADIENT[type ?? 'other'] ?? TYPE_GRADIENT.other, sizes[size], className)}>
      <DynamicIcon name={TYPE_ICON[type ?? 'other'] ?? 'Sparkles'} />
    </div>
  );
}

/** Horizontal lifecycle tracker: Started → … → Completed. */
export function StatusTracker({ status, compact }: { status: ProjectStatus; compact?: boolean }) {
  const { t } = useI18n();
  const current = PROJECT_STATUSES.indexOf(status);
  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-surface-3" />
        <motion.div
          className="absolute start-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand to-accent rtl:bg-gradient-to-l"
          initial={{ width: 0 }}
          animate={{ width: `calc(${(current / (PROJECT_STATUSES.length - 1)) * 100}% - ${current === PROJECT_STATUSES.length - 1 ? 24 : 12}px)` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        {PROJECT_STATUSES.map((s, i) => {
          const done = i < current || status === 'COMPLETED';
          const active = i === current && status !== 'COMPLETED';
          return (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{ scale: active ? 1.1 : 1 }}
                className={cn(
                  'flex items-center justify-center rounded-full ring-4 ring-surface transition-colors',
                  compact ? 'size-5' : 'size-7',
                  done ? 'bg-brand text-white' : active ? 'bg-surface text-brand ring-brand/25 shadow-[0_0_0_2px_var(--brand)_inset]' : 'bg-surface-3 text-muted',
                )}
              >
                {done ? <Check className={compact ? 'size-3' : 'size-3.5'} strokeWidth={3} /> : active ? <span className="size-2 animate-pulse rounded-full bg-brand" /> : null}
              </motion.div>
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-2.5 flex justify-between gap-0.5">
          {PROJECT_STATUSES.map((s, i) => (
            <span
              key={s}
              className={cn(
                'flex-1 min-w-0 truncate text-center text-[10px] leading-tight sm:text-[11px]',
                i === current ? 'font-semibold text-fg' : 'text-muted',
                i === 0 && 'text-start',
                i === PROJECT_STATUSES.length - 1 && 'text-end',
              )}
            >
              {t(`statusShort.${s}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function DueLabel({ date }: { date: string | null }) {
  const { t, locale } = useI18n();
  const d = daysUntil(date);
  if (d === null) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', d < 0 ? 'text-danger' : d <= 7 ? 'text-warning' : 'text-muted')}>
      <Calendar className="size-3.5" />
      {d < 0 ? t('common.overdue', { n: -d }) : d === 0 ? t('common.today') : formatDate(date, locale, { day: 'numeric', month: 'short' })}
    </span>
  );
}

export function ProjectCard({ p, index = 0, clientView }: { p: ProjectListItem; index?: number; clientView?: boolean }) {
  const { t, locale } = useI18n();
  const draft = p.status === 'STARTED' || p.status === 'REQUIREMENTS';
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          <TypeTile type={p.projectType} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/app/projects/${p.id}`} className="truncate text-[15px] font-semibold text-fg after:absolute after:inset-0">
                {p.title}
              </Link>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              {p.code}
              {!clientView && ` · ${p.client.clientProfile?.companyName || p.client.name}`}
            </p>
          </div>
          <StatusBadge status={p.status} short />
        </div>

        {clientView && !draft ? (
          <div className="mt-6">
            <StatusTracker status={p.status} compact />
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">{t('dashboard.progress')}</span>
              <span className="font-medium tabular-nums text-fg-2">{p.progress}%</span>
            </div>
            <Progress value={p.progress} />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {p.members.length > 0 ? <AvatarStack names={p.members.map((m) => m.user.name)} /> : <span className="text-xs text-muted">{t('common.unassigned')}</span>}
            {!clientView && <PriorityBadge priority={p.priority} />}
          </div>
          <div className="flex items-center gap-3">
            <DueLabel date={p.dueDate} />
            <span className="text-[11px] text-muted">{timeAgo(p.updatedAt, locale)}</span>
          </div>
        </div>

        {clientView && draft && (
          <Button asChild size="sm" className="relative z-10 mt-5 w-full" rightIcon={<ArrowRight className="rtl-flip size-4" />}>
            <Link to={`/app/projects/${p.id}/journey`}>{t('dashboard.continueJourney')}</Link>
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
