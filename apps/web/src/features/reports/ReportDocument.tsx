import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AlertTriangle, Bot, CalendarClock, Copy, Download, FileText, Languages, ListChecks, Printer, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import type { TechnicalReportDetail } from '../../lib/types';
import { cn, formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/surfaces';
import { Avatar } from '../../components/ui/feedback';
import { Markdown } from '../../components/ui/markdown';

const plain = (s: string) => s.replace(/[*_`]/g, '').replace(/^\d+\.\s*/, '').trim();

function CoverStat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3.5 py-2.5 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/60 [&>svg]:size-3">
        {icon} {label}
      </p>
      <div className="mt-1 truncate text-[13px] font-medium text-white">{children}</div>
    </div>
  );
}

/**
 * The technical report as a proper document: cover with provenance, sticky table of contents,
 * readable body in the report's own language and a print stylesheet for a clean PDF.
 */
export function ReportDocument({
  report,
  latest,
  onShare,
  onCreateTickets,
  onRegenerate,
  regenerating,
  onUnshare,
}: {
  report: TechnicalReportDetail;
  latest?: boolean;
  onShare?: () => void;
  onCreateTickets?: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onUnshare?: (userId: string) => void;
}) {
  const { t, locale } = useI18n();
  const prefix = `rp-${report.id}`;
  const body = useMemo(() => report.content.replace(/^\s*#\s+.*\n?/, ''), [report.content]);
  const sections = useMemo(() => body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => plain(l.replace(/^##\s+/, ''))), [body]);
  const [active, setActive] = useState(0);
  const rtl = report.locale === 'ar';

  useEffect(() => {
    setActive(0);
    const els = sections.map((_, i) => document.getElementById(`${prefix}-${i}`)).filter((el): el is HTMLElement => !!el);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(Number(top.target.id.slice(prefix.length + 1)));
      },
      { rootMargin: '-90px 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [prefix, sections.length]);

  const go = (i: number) => document.getElementById(`${prefix}-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const filename = `${report.project.code}-technical-report-v${report.version}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      toast.success(t('report.copied'));
    } catch {
      toast.error(t('common.errorTitle'));
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([report.content], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article id="report-print" className="overflow-clip rounded-2xl bg-surface shadow-sm ring-1 ring-border">
      <header className="report-cover relative overflow-hidden bg-gradient-to-br from-[#171747] via-[#3431c4] to-[#0891b2] px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8">
        <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 start-1/3 size-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
              <FileText className="size-3.5" /> {t('report.title')}
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#3431c4]">v{report.version}</span>
            {latest && <span className="rounded-full bg-emerald-400/90 px-2 py-0.5 text-[10.5px] font-bold text-emerald-950">{t('report.latest')}</span>}
            {report.stale && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10.5px] font-bold text-amber-950">{t('report.outdated')}</span>}
            {report.mock && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-semibold">{t('report.demo')}</span>}
          </div>
          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-[32px]">{report.project.title}</h2>
          <p className="mt-1 text-xs text-white/70">
            <bdi dir="ltr" className="font-mono">{report.project.code}</bdi> · {t('report.based', { n: report.answerCount })}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <CoverStat icon={<CalendarClock />} label={t('report.generatedOn')}>{formatDateTime(report.createdAt, locale)}</CoverStat>
            <CoverStat icon={<Avatar name={report.createdBy.name} size="xs" />} label={t('report.author')}>{report.createdBy.name}</CoverStat>
            <CoverStat icon={<Languages />} label={t('report.language')}>{report.locale === 'ar' ? t('report.langAr') : t('report.langEn')}</CoverStat>
            <CoverStat icon={<Bot />} label={t('report.model')}><bdi dir="ltr">{report.model ?? t('report.demo')}</bdi></CoverStat>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2/40 px-4 py-3 print:hidden sm:px-6">
        <Button size="sm" variant="secondary" leftIcon={<Copy className="size-4" />} onClick={copy}>{t('report.copy')}</Button>
        <Button size="sm" variant="secondary" leftIcon={<Download className="size-4" />} onClick={download}>{t('report.download')}</Button>
        <Button size="sm" variant="secondary" leftIcon={<Printer className="size-4" />} onClick={() => window.print()}>{t('report.print')}</Button>
        <span className="flex-1" />
        {onCreateTickets && (
          <Button size="sm" variant="soft" leftIcon={<ListChecks className="size-4" />} onClick={onCreateTickets}>{t('report.createTickets')}</Button>
        )}
        {onShare && (
          <Button size="sm" leftIcon={<Send className="rtl-flip size-4" />} onClick={onShare}>{t('report.share')}</Button>
        )}
      </div>

      {report.stale && onRegenerate && (
        <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl bg-warning-soft px-4 py-3 ring-1 ring-warning/25 print:hidden sm:mx-6 sm:flex-row sm:items-center">
          <p className="flex flex-1 items-center gap-2.5 text-[13px] text-fg-2">
            <AlertTriangle className="size-4 shrink-0 text-warning" /> {t('report.outdatedBanner')}
          </p>
          <Button size="sm" variant="secondary" loading={regenerating} leftIcon={<RefreshCw className="size-4" />} onClick={onRegenerate}>
            {t('report.outdatedAction')}
          </Button>
        </div>
      )}

      <div className="grid gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        {sections.length > 1 && (
          <nav aria-label={t('report.contents')} className="min-w-0 print:hidden lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-wider text-muted lg:block">{t('report.contents')}</p>
            <ol className="chic-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
              {sections.map((s, i) => (
                <li key={i} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className={cn(
                      'relative w-full rounded-lg px-2.5 py-1.5 text-start text-[12.5px] leading-snug transition-colors',
                      active === i ? 'bg-brand-soft font-semibold text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )}
                  >
                    {active === i && <motion.span layoutId={`toc-${report.id}`} className="absolute inset-y-1.5 start-0 hidden w-0.5 rounded-full bg-brand lg:block" />}
                    <span className="line-clamp-2">{s}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div
          dir={rtl ? 'rtl' : 'ltr'}
          lang={report.locale}
          className="min-w-0 [&_p[id]]:mt-9 [&_p[id]]:border-t [&_p[id]]:border-border [&_p[id]]:pt-6 [&_p[id]]:text-[18px] [&_p[id]]:font-bold [&_p[id]]:tracking-tight [&_p[id]:first-child]:mt-0 [&_p[id]:first-child]:border-0 [&_p[id]:first-child]:pt-0"
        >
          <Markdown source={body} headingIdPrefix={prefix} className="text-[14.5px] leading-7" />
        </div>
      </div>

      <footer className="space-y-3 border-t border-border bg-surface-2/40 px-4 py-4 sm:px-8">
        {report.shares.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span className="text-xs font-medium text-muted">{t('report.sharedWith', { n: report.shares.length })}</span>
            {report.shares.map((s) => (
              <Badge key={s.id} className="gap-1.5 bg-surface py-1 ps-1 pe-2 text-fg-2 ring-border">
                <Avatar name={s.recipient.name} size="xs" />
                {s.recipient.name}
                {onUnshare && (
                  <button type="button" onClick={() => onUnshare(s.recipient.id)} aria-label={t('report.unshare')} title={t('report.unshare')} className="rounded-full p-0.5 text-muted hover:bg-danger-soft hover:text-danger">
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-px size-3.5 shrink-0" /> {t('report.confidential')}
        </p>
      </footer>
    </article>
  );
}
