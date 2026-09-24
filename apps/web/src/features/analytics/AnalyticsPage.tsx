import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CheckCircle2, Clock, FolderInput, Sparkles, Table2, Timer, Users } from 'lucide-react';
import { PROJECT_STATUSES } from '@welco/shared';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { BriefUser } from '../../lib/types';
import { cn, formatDate } from '../../lib/utils';
import { STATUS_STYLE } from '../../lib/meta';
import { SegmentedControl } from '../../components/ui/form';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/surfaces';
import { Avatar, PageLoader, Progress } from '../../components/ui/feedback';
import { Button } from '../../components/ui/button';

interface Overview {
  kpis: { requests: number; submitted: number; conversionRate: number; avgDaysToSubmit: number; active: number; completed: number; clients: number; newClients: number; aiRequests: number };
  byStatus: Record<string, number>;
  byType: { value: string; label: string; count: number }[];
  topFeatures: { label: string; count: number }[];
  weekly: { week: string; started: number; submitted: number }[];
  funnel: { stage: string; count: number }[];
  workload: (BriefUser & { title: string | null; capacity: number; activeProjects: number; openTasks: number })[];
}

/** Direct-labelled horizontal bars: one hue (magnitude), value in text ink, 4px rounded data end. */
function BarList({ rows, format }: { rows: { key: string; label: React.ReactNode; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key} title={`${r.value}`} className="group">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate text-fg-2">{r.label}</span>
            <span className="font-medium tabular-nums text-fg">{format ? format(r.value) : r.value}</span>
          </div>
          <div className="h-2 w-full rounded-e-[4px] bg-surface-2">
            <motion.div
              className="h-full rounded-e-[4px] bg-[var(--series-1)] transition-opacity group-hover:opacity-80"
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 80, damping: 20 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({ data }: { data: Overview['weekly'] }) {
  const { t, locale } = useI18n();
  const [table, setTable] = useState(false);
  const fmt = (d: string) => formatDate(d, locale, { day: 'numeric', month: 'short' });
  const series = [
    { key: 'started', label: t('analytics.started'), color: 'var(--series-1)' },
    { key: 'submitted', label: t('analytics.submitted'), color: 'var(--series-2)' },
  ] as const;
  const last = data[data.length - 1];
  return (
    <Card>
      <CardHeader
        title={t('analytics.trend')}
        icon={<BarChart3 className="size-4" />}
        action={
          <Button size="xs" variant="ghost" leftIcon={<Table2 className="size-3.5" />} onClick={() => setTable((v) => !v)} aria-pressed={table}>
            {table ? t('analytics.chartView') : t('analytics.tableView')}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-4 px-5 pb-2 text-xs text-fg-2">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} /> {s.label}
            {last && <span className="font-medium tabular-nums text-fg">{last[s.key]}</span>}
          </span>
        ))}
      </div>
      {table ? (
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 text-start font-medium">{t('analytics.week')}</th>
                {series.map((s) => <th key={s.key} className="py-2 text-end font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((w) => (
                <tr key={w.week} className="border-b border-border/60">
                  <td className="py-1.5">{fmt(w.week)}</td>
                  <td className="py-1.5 text-end">{w.started}</td>
                  <td className="py-1.5 text-end">{w.submitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 px-2 pb-4" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -18, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="week" tickFormatter={fmt} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} minTickGap={20} reversed={locale === 'ar'} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--fg)' }}
                labelFormatter={(d) => fmt(d as string)}
              />
              {series.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<'7' | '30' | '90' | '365'>('90');
  const q = useQuery({ queryKey: ['analytics', Number(range)], queryFn: () => api.get<Overview>(`/analytics/overview?range=${range}`) });
  const d = q.data;

  return (
    <>
      <PageHeader
        title={t('analytics.title')}
        subtitle={t('analytics.subtitle')}
        actions={
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={(['7', '30', '90', '365'] as const).map((r) => ({ value: r, label: t('analytics.range', { n: r }) }))}
          />
        }
      />
      {!d ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label={t('analytics.requests')} value={d.kpis.requests} icon={<FolderInput className="size-4" />} />
            <StatCard label={t('analytics.submitted')} value={d.kpis.submitted} icon={<CheckCircle2 className="size-4" />} tone="success" />
            <StatCard label={t('analytics.conversion')} value={`${d.kpis.conversionRate}%`} icon={<Clock className="size-4" />} tone="info" />
            <StatCard label={t('analytics.avgTime')} value={t('analytics.daysUnit', { n: d.kpis.avgDaysToSubmit })} icon={<Timer className="size-4" />} tone="warning" />
            <StatCard label={t('analytics.aiRequests')} value={d.kpis.aiRequests} icon={<Sparkles className="size-4" />} hint={`${d.kpis.clients} ${t('analytics.clients').toLowerCase()} · +${d.kpis.newClients}`} />
          </div>

          <TrendChart data={d.weekly} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('analytics.byType')} />
              <div className="px-5 pb-5">
                <BarList rows={d.byType.map((r) => ({ key: r.value, label: r.label, value: r.count }))} />
              </div>
            </Card>
            <Card>
              <CardHeader title={t('analytics.features')} />
              <div className="px-5 pb-5">
                <BarList rows={d.topFeatures.map((r) => ({ key: r.label, label: r.label, value: r.count }))} />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('analytics.funnel')} />
              <div className="px-5 pb-5">
                <BarList
                  rows={d.funnel.map((f) => ({ key: f.stage, label: t(`analytics.funnelStages.${f.stage}`), value: f.count }))}
                  format={(n) => `${n} · ${d.funnel[0].count ? Math.round((n / d.funnel[0].count) * 100) : 0}%`}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title={t('analytics.byStatus')} />
              <div className="px-5 pb-5">
                <BarList
                  rows={PROJECT_STATUSES.map((s) => ({
                    key: s,
                    label: <span className="inline-flex items-center gap-2"><span className={cn('size-2 rounded-full', STATUS_STYLE[s].dot)} />{t(`status.${s}`)}</span>,
                    value: d.byStatus[s] ?? 0,
                  }))}
                />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title={t('analytics.workload')} icon={<Users className="size-4" />} />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
              {d.workload.map((w) => (
                <div key={w.id} className="rounded-2xl bg-surface-2/50 p-4 ring-1 ring-border">
                  <div className="flex items-center gap-3">
                    <Avatar name={w.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{w.name}</p>
                      <p className="truncate text-[11px] text-muted">{w.title ?? t(`roles.${w.role}`)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-xs text-muted">
                    <span>{w.activeProjects}/{w.capacity} {t('analytics.projects')}</span>
                    <span>{w.openTasks} {t('analytics.openTasks')}</span>
                  </div>
                  <Progress value={(w.activeProjects / Math.max(1, w.capacity)) * 100} className="mt-2" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
