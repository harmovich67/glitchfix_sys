import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { CURRENCIES, PAYMENT_PRESETS, allQuestions, formatMoney, proposalTotals, type Currency, type PaymentMilestone } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n, type Locale } from '../../lib/i18n';
import type { ProjectDetail, ProposalDetail, ProposalItem, ProposalsResponse } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, SegmentedControl, Select, Textarea } from '../../components/ui/form';
import { Modal } from '../../components/ui/overlay';
import { Spinner } from '../../components/ui/feedback';

const MILESTONE_KEYS: Record<string, string> = { start: 'msStart', middle: 'msMiddle', delivery: 'msDelivery' };

/** Preset schedule with labels written in the proposal's own language. */
function presetPayments(preset: keyof typeof PAYMENT_PRESETS, loc: Locale, tIn: (l: Locale, k: string) => string): PaymentMilestone[] {
  return PAYMENT_PRESETS[preset].milestones.map((m) => ({ label: tIn(loc, `proposal.form.${MILESTONE_KEYS[m.key]}`), percent: m.percent }));
}

/** Sensible starting point for the delivery time: more features, more weeks. */
function suggestWeeks(project: ProjectDetail) {
  const featureIds = new Set(allQuestions(project.workflow).filter((q) => q.type === 'feature_checklist').map((q) => q.key));
  const features = [...featureIds].reduce((n, k) => n + (Array.isArray(project.answers[k]) ? (project.answers[k] as string[]).length : 0), 0);
  return { features, weeks: Math.min(26, Math.max(3, Math.ceil(features / 3) + 3)) };
}

/**
 * Price and terms for a proposal. Creating one asks the AI to write the client-facing text from the requirements;
 * editing a draft only changes the numbers and terms.
 */
export function ProposalFormDialog({
  project,
  defaults,
  editing,
  open,
  onOpenChange,
  onSaved,
}: {
  project: ProjectDetail;
  defaults: ProposalsResponse['defaults'];
  editing?: ProposalItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (p: ProposalDetail) => void;
}) {
  const { t, tIn, locale } = useI18n();
  const qc = useQueryClient();
  const suggested = useMemo(() => suggestWeeks(project), [project]);

  const initial = () => {
    const loc: Locale = editing?.locale ?? locale;
    return {
      locale: loc,
      title: editing?.title ?? '',
      currency: (editing?.currency ?? defaults?.currency ?? 'USD') as Currency,
      amount: editing ? String(editing.amount) : '',
      taxPercent: String(editing?.taxPercent ?? defaults?.taxPercent ?? 0),
      durationWeeks: String(editing?.durationWeeks ?? suggested.weeks),
      validDays: String(editing?.validDays ?? defaults?.validDays ?? 14),
      payments: (editing?.payments ?? presetPayments('half', loc, tIn)) as PaymentMilestone[],
      notes: editing?.notes ?? '',
    };
  };
  const [f, setF] = useState(initial);
  const [preset, setPreset] = useState<string>(editing ? 'custom' : 'half');
  useEffect(() => {
    if (open) {
      setF(initial());
      setPreset(editing ? 'custom' : 'half');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = Number(f.amount);
  const tax = Number(f.taxPercent || 0);
  const sum = Math.round(f.payments.reduce((n, p) => n + (Number(p.percent) || 0), 0) * 100) / 100;
  const valid = amount > 0 && sum === 100 && f.payments.every((p) => p.label.trim() && p.percent > 0) && tax >= 0 && tax <= 100 && Number(f.validDays) >= 1 && Number(f.durationWeeks) >= 1;
  const preview = useMemo(() => (amount > 0 && sum === 100 ? proposalTotals(amount, tax, f.payments) : null), [amount, tax, sum, f.payments]);

  const body = () => ({
    title: f.title.trim() || undefined,
    currency: f.currency,
    amount,
    taxPercent: tax,
    durationWeeks: Number(f.durationWeeks) || null,
    validDays: Number(f.validDays) || 14,
    payments: f.payments.map((p) => ({ label: p.label.trim(), percent: Number(p.percent) })),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.patch<ProposalDetail>(`/projects/${project.id}/proposals/${editing.id}`, { ...body(), notes: f.notes.trim() || null })
        : api.post<ProposalDetail>(`/projects/${project.id}/proposals`, { ...body(), locale: f.locale, notes: f.notes.trim() || undefined }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
      onOpenChange(false);
      onSaved(p);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setPay = (i: number, patch: Partial<PaymentMilestone>) => {
    setPreset('custom');
    setF({ ...f, payments: f.payments.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  };
  const choosePreset = (key: string) => {
    setPreset(key);
    if (key !== 'custom') setF({ ...f, payments: presetPayments(key as keyof typeof PAYMENT_PRESETS, f.locale, tIn) });
  };
  const changeLocale = (loc: Locale) =>
    setF({ ...f, locale: loc, payments: preset !== 'custom' ? presetPayments(preset as keyof typeof PAYMENT_PRESETS, loc, tIn) : f.payments });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !save.isPending && onOpenChange(o)}
      size="lg"
      title={editing ? t('proposal.form.editTitle') : t('proposal.form.title')}
      description={editing ? undefined : t('proposal.form.subtitle')}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button disabled={!valid} loading={save.isPending} leftIcon={editing ? undefined : <Sparkles className="size-4" />} onClick={() => save.mutate()}>
            {editing ? t('proposal.form.save') : t('proposal.form.generate')}
          </Button>
        </>
      }
    >
      {save.isPending && !editing ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <Spinner className="size-8 text-brand" />
          <p className="text-sm font-semibold">{t('proposal.form.generating')}</p>
          <p className="text-xs text-muted">{t('proposal.form.generatingHint')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label={t('proposal.form.amount')} required>
              <Input type="number" min={0} step="0.01" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus placeholder="25000" />
            </Field>
            <Field label={t('proposal.form.currency')}>
              <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('proposal.form.tax')}><Input type="number" min={0} max={100} step="0.5" value={f.taxPercent} onChange={(e) => setF({ ...f, taxPercent: e.target.value })} /></Field>
            <Field label={t('proposal.form.duration')} hint={!editing ? t('proposal.form.durationHint', { n: suggested.weeks, f: suggested.features }) : undefined}>
              <Input type="number" min={1} max={260} value={f.durationWeeks} onChange={(e) => setF({ ...f, durationWeeks: e.target.value })} />
            </Field>
            <Field label={t('proposal.form.validity')}><Input type="number" min={1} max={180} value={f.validDays} onChange={(e) => setF({ ...f, validDays: e.target.value })} /></Field>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-fg-2">{t('proposal.form.payments')}</p>
              <SegmentedControl
                size="sm"
                value={preset}
                onChange={choosePreset}
                options={[
                  ...Object.entries(PAYMENT_PRESETS).map(([k, v]) => ({ value: k, label: t(v.labelKey) })),
                  { value: 'custom', label: t('proposal.form.custom') },
                ]}
              />
            </div>
            {f.payments.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p.label} onChange={(e) => setPay(i, { label: e.target.value })} maxLength={80} aria-label={t('proposal.form.milestone')} className="h-9" />
                <div className="relative w-24 shrink-0">
                  <Input type="number" min={1} max={100} value={p.percent} onChange={(e) => setPay(i, { percent: Number(e.target.value) })} className="h-9 pe-7" aria-label={t('proposal.form.percent')} />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted">%</span>
                </div>
                <Button size="icon-sm" variant="ghost" disabled={f.payments.length === 1} onClick={() => { setPreset('custom'); setF({ ...f, payments: f.payments.filter((_, j) => j !== i) }); }} aria-label={t('common.remove')}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button size="xs" variant="ghost" disabled={f.payments.length >= 6} leftIcon={<Plus className="size-3.5" />} onClick={() => { setPreset('custom'); setF({ ...f, payments: [...f.payments, { label: '', percent: Math.max(1, 100 - sum) }] }); }}>
                {t('proposal.form.addMilestone')}
              </Button>
              <span className={cn('text-xs font-medium tabular-nums', sum === 100 ? 'text-success' : 'text-danger')}>{sum === 100 ? t('proposal.form.sum', { n: 100 }) : t('proposal.form.mustBe100')}</span>
            </div>
          </div>

          {preview && (
            <div className="rounded-xl bg-surface-2/60 p-4 ring-1 ring-border">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted">{t('proposal.totals.total')}{tax > 0 ? ` (${t('proposal.totals.tax', { n: tax })})` : ''}</span>
                <span className="text-xl font-bold tabular-nums text-brand">{formatMoney(preview.total, f.currency, locale)}</span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {preview.schedule.map((m, i) => <li key={i}>{m.percent}% · <span className="tabular-nums text-fg-2">{formatMoney(m.amount, f.currency, locale)}</span></li>)}
              </ul>
            </div>
          )}

          {!editing && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label={t('proposal.form.name')}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} /></Field>
              <Field label={t('proposal.form.language')}>
                <SegmentedControl<Locale> value={f.locale} onChange={changeLocale} options={[{ value: 'ar', label: 'عربي' }, { value: 'en', label: 'English' }]} />
              </Field>
            </div>
          )}
          <Field label={t('proposal.form.notes')} hint={t('proposal.form.notesHint')}>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={2000} className="min-h-20" />
          </Field>
        </div>
      )}
    </Modal>
  );
}
