import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Bot, FileText, Share2, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useI18n, type Locale } from '../../lib/i18n';
import type { ProjectDetail, TechnicalReport, TechnicalReportDetail, TechnicalReportsResponse } from '../../lib/types';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { SegmentedControl } from '../../components/ui/form';
import { Badge, Card } from '../../components/ui/surfaces';
import { Avatar, EmptyState, Skeleton, Spinner } from '../../components/ui/feedback';
import { ReportView } from './ReportView';

function HistoryItem({ report, selected, latest, onSelect, isLast }: { report: TechnicalReport; selected: boolean; latest: boolean; onSelect: () => void; isLast: boolean }) {
  const { t, locale } = useI18n();
  return (
    <li className="relative">
      {!isLast && <span className="absolute start-[17px] top-10 bottom-[-6px] w-px bg-border" />}
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cn(
          'relative flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition-colors',
          selected ? 'bg-brand-soft/60 ring-1 ring-brand/30' : 'hover:bg-surface-2',
        )}
      >
        <span
          className={cn(
            'relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-surface',
            selected ? 'bg-brand text-white' : 'bg-surface-3 text-fg-2',
          )}
        >
          {report.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold">{t('report.version', { n: report.version })}</span>
            {latest && <Badge className="bg-success-soft py-0 text-[10.5px] text-success ring-success/20">{t('report.latest')}</Badge>}
            {report.stale && <Badge className="bg-warning-soft py-0 text-[10.5px] text-warning ring-warning/20">{t('report.outdated')}</Badge>}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-muted" title={formatDateTime(report.createdAt, locale)}>{timeAgo(report.createdAt, locale)}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><Avatar name={report.createdBy.name} size="xs" /> {report.createdBy.name}</span>
            <span>{report.locale === 'ar' ? 'عربي' : 'EN'}</span>
            {report.mock && <span>{t('report.demo')}</span>}
            {report.shares.length > 0 && (
              <span className="inline-flex items-center gap-1 text-brand"><Share2 className="size-3" />{report.shares.length}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Project → Requirements → Technical reports: generate, browse the version log, read and send reports. */
export function TechnicalReportsPanel({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [genLocale, setGenLocale] = useState<Locale>(locale);

  const list = useQuery({
    queryKey: ['reports', project.id],
    queryFn: () => api.get<TechnicalReportsResponse>(`/ai/projects/${project.id}/technical-reports`),
  });
  const reports = list.data?.reports ?? [];
  const latestId = reports[0]?.id;
  const activeId = selected && reports.some((r) => r.id === selected) ? selected : latestId;

  const detail = useQuery({
    queryKey: ['report', activeId],
    queryFn: () => api.get<TechnicalReportDetail>(`/ai/technical-reports/${activeId}`),
    enabled: !!activeId,
  });

  const gen = useMutation({
    mutationFn: (target: Locale) => api.post<TechnicalReport>(`/ai/projects/${project.id}/technical-reports`, { locale: target }),
    onSuccess: (r) => {
      setSelected(r.id);
      qc.invalidateQueries({ queryKey: ['reports', project.id] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // The default language follows the interface language until the manager picks one explicitly.
  useEffect(() => setGenLocale(locale), [locale]);

  const canGenerate = !!list.data?.canGenerate;

  if (list.isLoading)
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-[480px] rounded-2xl" />
      </div>
    );

  const generateBar = canGenerate && (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<Locale>
        size="sm"
        value={genLocale}
        onChange={setGenLocale}
        options={[
          { value: 'ar', label: t('report.langAr') },
          { value: 'en', label: t('report.langEn') },
        ]}
      />
      <Button loading={gen.isPending} leftIcon={<Sparkles className="size-4" />} onClick={() => gen.mutate(genLocale)}>
        {reports.length ? t('report.generateNew') : t('report.generate')}
      </Button>
    </div>
  );

  if (!reports.length && !gen.isPending)
    return (
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-brand/15 blur-3xl" />
        <EmptyState
          icon={<FileText className="size-6" />}
          title={canGenerate ? t('report.emptyTitle') : t('report.emptyDev')}
          description={canGenerate ? t('report.emptyBody') : undefined}
          action={generateBar || undefined}
          className="py-16"
        />
      </Card>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('report.title')}</h2>
          <p className="text-xs text-muted">{t('report.subtitle')}</p>
        </div>
        {generateBar}
      </div>

      {gen.isPending && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 bg-gradient-to-r from-brand-soft via-surface to-surface p-5">
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
                <Bot className="size-5" />
                <span className="absolute -end-1 -top-1"><Spinner className="size-4 text-brand" /></span>
              </div>
              <div>
                <p className="text-sm font-semibold">{t('report.generating')}</p>
                <p className="text-xs text-muted">{t('report.generatingHint')}</p>
              </div>
            </div>
            <div className="space-y-2 p-5">
              {[92, 78, 85, 60].map((w) => (
                <div key={w} style={{ width: `${w}%` }}>
                  <Skeleton className="h-3.5" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {reports.length > 0 && (
        <div className="grid items-start gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
          <Card className="lg:sticky lg:top-20">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-[13px] font-semibold">{t('report.history')}</h3>
              <span className="text-xs tabular-nums text-muted">{reports.length}</span>
            </div>
            <ul className="chic-scrollbar max-h-[60vh] space-y-1 overflow-y-auto px-2 pb-3">
              {reports.map((r, i) => (
                <HistoryItem key={r.id} report={r} selected={r.id === activeId} latest={r.id === latestId} onSelect={() => setSelected(r.id)} isLast={i === reports.length - 1} />
              ))}
            </ul>
          </Card>

          <div className="min-w-0">
            {detail.data && detail.data.id === activeId ? (
              <ReportView
                key={detail.data.id}
                report={detail.data}
                latest={detail.data.id === latestId}
                regenerating={gen.isPending}
                onRegenerate={() => gen.mutate(detail.data.locale)}
              />
            ) : (
              <Skeleton className="h-[520px] rounded-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
