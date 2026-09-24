import type { ReactNode } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Mail, Phone, Printer, ShieldCheck, Wallet } from 'lucide-react';
import { formatMoney } from '@welco/shared';
import { usePublicSettings } from '../../lib/brand';
import { useI18n } from '../../lib/i18n';
import type { ProposalDetail } from '../../lib/types';
import { cn, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Markdown } from '../../components/ui/markdown';
import { LogoMark } from '../../components/layout/Logo';

function daysLeft(iso: string | null) {
  return iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;
}

/**
 * The proposal as the client reads it: cover, headline numbers, the written offer, a price and payment
 * table generated from the exact figures (never from AI text), the standard terms and — via `footer` —
 * the approval panel. It is written in the proposal's own language whatever the UI language is.
 */
export function ProposalDocument({ proposal, preparedFor, footer, showPrint = true }: { proposal: ProposalDetail; preparedFor: string; footer?: ReactNode; showPrint?: boolean }) {
  const { tIn, brand } = useI18n();
  const contact = usePublicSettings().data?.contact;
  const loc = proposal.locale;
  const d = (key: string, vars?: Record<string, string | number>) => tIn(loc, `proposal.doc.${key}`, vars);
  const money = (v: number) => formatMoney(v, proposal.currency, loc);
  const rtl = loc === 'ar';
  const left = daysLeft(proposal.validUntil);
  const open = proposal.status === 'SENT';
  const { totals } = proposal;

  const stat = (icon: ReactNode, label: string, value: ReactNode, tone?: string) => (
    <div className="min-w-0 rounded-2xl bg-surface-2/60 p-4 ring-1 ring-border">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted [&>svg]:size-3.5">{icon}{label}</p>
      <p className={cn('mt-1.5 truncate text-[17px] font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );

  return (
    <article id="proposal-print" dir={rtl ? 'rtl' : 'ltr'} lang={loc} className="overflow-clip rounded-2xl bg-surface shadow-sm ring-1 ring-border">
      <header className="report-cover relative overflow-hidden bg-gradient-to-br from-[#121236] via-[#2c2aa8] to-[#0b7fa5] px-6 pb-8 pt-7 text-white sm:px-10 sm:pt-9">
        <div className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 start-1/4 size-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[15px] font-semibold"><LogoMark className="size-7" /> {brand.name}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-white/25">v{proposal.version}</span>
          </div>
          <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">{d('eyebrow')}</p>
          <h2 className="mt-2 max-w-3xl text-[26px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-[36px]">{proposal.title}</h2>
          <dl className="mt-6 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-3">
            <div><dt className="text-white/60">{d('preparedFor')}</dt><dd className="mt-0.5 font-medium">{preparedFor}</dd></div>
            <div><dt className="text-white/60">{d('project')}</dt><dd className="mt-0.5 font-medium"><bdi dir="ltr" className="font-mono">{proposal.project.code}</bdi></dd></div>
            <div><dt className="text-white/60">{d('validUntil')}</dt><dd className="mt-0.5 font-medium">{proposal.validUntil ? formatDate(proposal.validUntil, loc) : '—'}</dd></div>
          </dl>
        </div>
      </header>

      <div className="space-y-8 px-5 py-7 sm:px-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {stat(<Wallet />, d('investment'), money(totals.total), 'text-brand')}
          {stat(<Clock3 />, d('timeline'), proposal.durationWeeks ? d('weeks', { n: proposal.durationWeeks }) : '—')}
          {stat(
            <CalendarClock />,
            d('validUntil'),
            proposal.expired ? d('expiredMsg') : open && left !== null ? (left <= 0 ? d('expiresToday') : d('expiresIn', { n: left })) : proposal.validUntil ? formatDate(proposal.validUntil, loc) : '—',
            proposal.expired ? 'text-danger' : open && left !== null && left <= 3 ? 'text-warning' : undefined,
          )}
        </div>

        <div className="[&_p[id]]:mt-9 [&_p[id]]:border-t [&_p[id]]:border-border [&_p[id]]:pt-6 [&_p[id]]:text-[18px] [&_p[id]]:font-bold [&_p[id]]:tracking-tight [&_p[id]:first-child]:mt-0 [&_p[id]:first-child]:border-0 [&_p[id]:first-child]:pt-0">
          <Markdown source={proposal.content} headingIdPrefix={`pp-${proposal.id}`} className="text-[14.5px] leading-7" />
        </div>

        {/* Investment: computed from the exact figures, so it can never disagree with the price. */}
        <section className="break-inside-avoid rounded-2xl ring-1 ring-border">
          <div className="border-b border-border bg-surface-2/50 px-5 py-3.5">
            <h3 className="text-[18px] font-bold">{d('investment')}</h3>
          </div>
          <div className="space-y-5 p-5">
            <table className="w-full text-[14px]">
              <tbody className="divide-y divide-border">
                <tr><td className="py-2.5 text-muted">{tIn(loc, 'proposal.totals.subtotal')}</td><td className="py-2.5 text-end font-medium tabular-nums">{money(totals.subtotal)}</td></tr>
                {proposal.taxPercent > 0 && <tr><td className="py-2.5 text-muted">{tIn(loc, 'proposal.totals.tax', { n: proposal.taxPercent })}</td><td className="py-2.5 text-end font-medium tabular-nums">{money(totals.tax)}</td></tr>}
                <tr><td className="pt-3.5 text-[16px] font-bold">{tIn(loc, 'proposal.totals.total')}</td><td className="pt-3.5 text-end text-[22px] font-bold tabular-nums text-brand">{money(totals.total)}</td></tr>
              </tbody>
            </table>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-fg-2">{d('schedule')}</p>
              <div className="overflow-hidden rounded-xl ring-1 ring-border">
                <table className="w-full text-[13.5px]">
                  <thead className="bg-surface-2/60 text-[11.5px] uppercase tracking-wide text-muted">
                    <tr><th className="px-4 py-2 text-start font-semibold">{d('milestone')}</th><th className="px-4 py-2 text-end font-semibold">{d('share')}</th><th className="px-4 py-2 text-end font-semibold">{d('amount')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {totals.schedule.map((m, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5"><span className="me-2 inline-flex size-5 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">{i + 1}</span>{m.label}</td>
                        <td className="px-4 py-2.5 text-end tabular-nums text-muted">{m.percent}%</td>
                        <td className="px-4 py-2.5 text-end font-semibold tabular-nums">{money(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11.5px] text-muted">{d('currencyNote', { c: proposal.currency })}</p>
            </div>
          </div>
        </section>

        {proposal.terms.trim() && (
          <section className="rounded-2xl bg-surface-2/40 p-5 ring-1 ring-border">
            <h3 className="mb-2 flex items-center gap-2 text-[18px] font-bold"><ShieldCheck className="size-5 text-brand" /> {d('terms')}</h3>
            <Markdown source={proposal.terms} className="text-[13px] leading-6" />
          </section>
        )}

        {proposal.status === 'ACCEPTED' && proposal.acceptedByName && (
          <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 ring-1 ring-success/25">
            <CheckCircle2 className="size-6 shrink-0 text-success" />
            <p className="text-[14px] font-medium text-fg">{d('approvedOn', { name: proposal.acceptedByName, date: formatDate(proposal.respondedAt, loc) })}</p>
          </div>
        )}
      </div>

      {footer && <div className="border-t border-border bg-surface-2/40 px-5 py-6 print:hidden sm:px-10">{footer}</div>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-[12px] text-muted sm:px-10">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-fg-2">{d('contact')}</span>
          {contact?.email && <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-brand"><Mail className="size-3.5" /><bdi dir="ltr">{contact.email}</bdi></a>}
          {contact?.phone && <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand"><Phone className="size-3.5" /><bdi dir="ltr">{contact.phone}</bdi></a>}
        </span>
        {showPrint && (
          <Button size="xs" variant="ghost" className="print:hidden" leftIcon={<Printer className="size-3.5" />} onClick={() => window.print()}>{d('print')}</Button>
        )}
      </footer>
    </article>
  );
}
