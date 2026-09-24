import { useEffect, useMemo, useState } from 'react';
import { FileSignature, Save } from 'lucide-react';
import { CURRENCIES, type PlatformSettings, type ProposalSettings } from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Field, Input, Select, Textarea } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';

const DEFAULTS: ProposalSettings = { defaultCurrency: 'USD', defaultValidDays: 14, defaultTaxPercent: 0, termsEn: '', termsAr: '' };

/** Defaults for new proposals: currency, validity, tax and the standard terms that get copied into each one. */
export function ProposalSettingsCard({ settings, onSave, isPending }: { settings: PlatformSettings; onSave: (s: PlatformSettings) => void; isPending: boolean }) {
  const { t } = useI18n();
  const [p, setP] = useState<ProposalSettings>({ ...DEFAULTS, ...settings.proposal });
  useEffect(() => setP({ ...DEFAULTS, ...settings.proposal }), [settings.proposal]);
  const dirty = useMemo(() => JSON.stringify(p) !== JSON.stringify({ ...DEFAULTS, ...settings.proposal }), [p, settings.proposal]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader title={t('proposal.settings.title')} description={t('proposal.settings.subtitle')} icon={<FileSignature className="size-4" />} />
      <div className="space-y-5 px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('proposal.settings.currency')}>
            <Select value={p.defaultCurrency} onChange={(e) => setP({ ...p, defaultCurrency: e.target.value as ProposalSettings['defaultCurrency'] })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t('proposal.settings.validity')}><Input type="number" min={1} max={180} value={p.defaultValidDays} onChange={(e) => setP({ ...p, defaultValidDays: Number(e.target.value) })} /></Field>
          <Field label={t('proposal.settings.tax')}><Input type="number" min={0} max={100} step="0.5" value={p.defaultTaxPercent} onChange={(e) => setP({ ...p, defaultTaxPercent: Number(e.target.value) })} /></Field>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label={t('proposal.settings.termsEn')} hint={t('proposal.settings.termsHint')}>
            <Textarea value={p.termsEn} onChange={(e) => setP({ ...p, termsEn: e.target.value })} maxLength={8000} className="min-h-72 font-mono text-[12.5px] leading-6" dir="ltr" />
          </Field>
          <Field label={t('proposal.settings.termsAr')} hint={t('proposal.settings.termsHint')}>
            <Textarea value={p.termsAr} onChange={(e) => setP({ ...p, termsAr: e.target.value })} maxLength={8000} className="min-h-72 font-mono text-[12.5px] leading-6" dir="rtl" />
          </Field>
        </div>
        <Button leftIcon={<Save className="size-4" />} disabled={!dirty || !(p.defaultValidDays >= 1)} loading={isPending} onClick={() => onSave({ ...settings, proposal: p })}>{t('common.save')}</Button>
      </div>
    </Card>
  );
}
