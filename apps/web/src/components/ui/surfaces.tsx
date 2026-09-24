import type { HTMLAttributes, ReactNode } from 'react';
import type { Priority, ProjectStatus } from '@welco/shared';
import { cn } from '../../lib/utils';
import { PRIORITY_STYLE, STATUS_STYLE } from '../../lib/meta';
import { useI18n } from '../../lib/i18n';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl bg-surface ring-1 ring-border shadow-xs', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({ className, children, dot }: { className?: string; children: ReactNode; dot?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', className ?? 'bg-surface-2 text-fg-2 ring-border')}>
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, short }: { status: ProjectStatus; short?: boolean }) {
  const { t } = useI18n();
  const s = STATUS_STYLE[status];
  return (
    <Badge className={s.badge} dot={s.dot}>
      {t(`${short ? 'statusShort' : 'status'}.${status}`)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n();
  return <Badge className={PRIORITY_STYLE[priority]}>{t(`priority.${priority}`)}</Badge>;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-5 sm:mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-semibold tracking-wide text-brand uppercase">{eyebrow}</div>}
        <h1 className="text-xl font-bold text-fg sm:text-[28px] tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'danger';
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    danger: 'bg-danger-soft text-danger',
  };
  return (
    <Card className="relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs sm:text-[13px] font-medium text-muted">{label}</p>
        {icon && <div className={cn('flex size-7 sm:size-8 items-center justify-center rounded-lg', tones[tone])}>{icon}</div>}
      </div>
      <p className="mt-2.5 sm:mt-3 text-2xl sm:text-[28px] leading-none font-bold tracking-tight text-fg tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[11px] sm:text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-border">{children}</kbd>;
}
