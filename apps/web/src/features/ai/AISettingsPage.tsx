import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Bot, Brain, Gauge, KeyRound, PlugZap, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { AI_PERSONAS, type AISettingsInput } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '../../components/ui/form';
import { Badge, Card, CardHeader, PageHeader, StatCard } from '../../components/ui/surfaces';
import { Avatar, PageLoader } from '../../components/ui/feedback';

interface AISettingsView extends Omit<AISettingsInput, 'apiKey'> {
  apiKeyMasked: string | null;
  apiKeySource: 'settings' | 'environment' | 'none';
  mode: 'live' | 'demo';
  updatedAt: string;
}
interface Usage {
  series: { date: string; requests: number; tokens: number }[];
  byKind: Record<string, number>;
  month: { requests: number; tokens: number };
  topUsers: { id?: string; name?: string; role?: string; count: number }[];
}

export default function AISettingsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['ai-settings'], queryFn: () => api.get<AISettingsView>('/ai/settings') });
  const usage = useQuery({ queryKey: ['ai-usage'], queryFn: () => api.get<Usage>('/ai/usage') });
  const [form, setForm] = useState<AISettingsInput | null>(null);

  useEffect(() => {
    if (settings.data) {
      const { apiKeyMasked: _m, apiKeySource: _s, mode: _mode, updatedAt: _u, ...rest } = settings.data;
      const pick = ({ enabled, model, fallbackModels, persona, systemPrompt, temperature, maxOutputTokens, dailyUserLimit, monthlyTokenLimit, allowSuggest, allowImprove, allowExplain }: typeof rest) => ({
        enabled, model, fallbackModels, persona, systemPrompt, temperature, maxOutputTokens, dailyUserLimit, monthlyTokenLimit, allowSuggest, allowImprove, allowExplain,
      });
      setForm({ ...pick(rest), apiKey: '' });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (body: AISettingsInput) => api.put<AISettingsView>('/ai/settings', body),
    onSuccess: (s) => {
      qc.setQueryData(['ai-settings'], s);
      qc.invalidateQueries({ queryKey: ['ai-status'] });
      toast.success(t('ai.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const test = useMutation({
    mutationFn: () => api.post<{ ok: boolean; mode: string; message: string; latencyMs?: number; model?: string }>('/ai/settings/test'),
    onSuccess: (r) => (r.ok ? toast.success(`${r.mode === 'live' ? `✓ ${r.model} · ${r.latencyMs} ms` : t('common.demo')}`, { description: r.message }) : toast.error(r.message)),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!form || !settings.data) return <PageLoader />;
  const s = settings.data;
  const set = (patch: Partial<AISettingsInput>) => setForm((f) => ({ ...f!, ...patch }));

  return (
    <>
      <PageHeader
        title={t('ai.title')}
        subtitle={t('ai.subtitle')}
        actions={
          <>
            <Button variant="secondary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<PlugZap className="size-4" />}>{t('ai.test')}</Button>
            <Button loading={save.isPending} onClick={() => save.mutate(form)} leftIcon={<Save className="size-4" />}>{t('common.save')}</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-md">
              <Bot className="size-6" />
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {t('ai.enabled')}
                <Badge className={s.mode === 'live' ? 'bg-success-soft text-success ring-success/20' : 'bg-warning-soft text-warning ring-warning/20'}>
                  {s.mode === 'live' ? t('common.live') : t('common.demo')}
                </Badge>
              </p>
              <p className="text-xs text-muted">{t('ai.enabledHint')}</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(enabled) => set({ enabled })} />
          </Card>

          <Card>
            <CardHeader title={t('ai.provider')} icon={<KeyRound className="size-4" />} description="Google Gemini" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label={t('ai.model')} hint="gemini-3.5-flash-lite">
                <Input value={form.model} dir="ltr" className="font-mono text-[13px]" onChange={(e) => set({ model: e.target.value })} />
              </Field>
              <Field
                label={t('ai.apiKey')}
                hint={s.apiKeySource === 'settings' ? `${s.apiKeyMasked} · ${t('ai.apiKeyHint')}` : s.apiKeySource === 'environment' ? t('ai.keyFromEnv') : t('ai.noKey')}
              >
                <Input type="password" dir="ltr" autoComplete="off" placeholder={s.apiKeyMasked ?? 'AIza…'} value={form.apiKey === '__clear__' ? '' : form.apiKey ?? ''} onChange={(e) => set({ apiKey: e.target.value })} />
              </Field>
              <Field label={t('ai.fallbackModels')} hint={t('ai.fallbackHint')} className="sm:col-span-2">
                <Input value={form.fallbackModels} dir="ltr" className="font-mono text-[13px]" placeholder="gemini-2.5-flash-lite" onChange={(e) => set({ fallbackModels: e.target.value })} />
              </Field>
              {s.apiKeySource === 'settings' && (
                <div className="sm:col-span-2">
                  <Button size="xs" variant="ghost" className="text-danger" onClick={() => save.mutate({ ...form, apiKey: '__clear__' })}>{t('ai.clearKey')}</Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('ai.behavior')} icon={<Brain className="size-4" />} />
            <div className="space-y-4 px-5 pb-5">
              <div className="grid gap-2 sm:grid-cols-4">
                {AI_PERSONAS.map((p) => (
                  <button
                    key={p}
                    onClick={() => set({ persona: p })}
                    className={`rounded-xl p-3 text-start text-[13px] font-medium ring-1 transition ${form.persona === p ? 'bg-brand-soft text-brand ring-2 ring-brand' : 'bg-surface ring-border hover:ring-border-strong'}`}
                  >
                    {t(`ai.personas.${p}`)}
                  </button>
                ))}
              </div>
              <Field label={t('ai.instructions')} hint={t('ai.instructionsHint')}>
                <Textarea value={form.systemPrompt} onChange={(e) => set({ systemPrompt: e.target.value })} className="min-h-52 font-mono text-[12.5px]" dir="auto" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`${t('ai.temperature')} · ${form.temperature.toFixed(1)}`}>
                  <input type="range" min={0} max={1.5} step={0.1} value={form.temperature} onChange={(e) => set({ temperature: Number(e.target.value) })} className="w-full accent-[var(--brand)]" />
                </Field>
                <Field label={t('ai.maxTokens')}>
                  <Input type="number" min={64} max={8192} value={form.maxOutputTokens} onChange={(e) => set({ maxOutputTokens: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('ai.limits')} icon={<Gauge className="size-4" />} description={t('ai.zeroUnlimited')} />
              <div className="space-y-4 px-5 pb-5">
                <Field label={t('ai.dailyLimit')}><Input type="number" min={0} value={form.dailyUserLimit} onChange={(e) => set({ dailyUserLimit: Number(e.target.value) })} /></Field>
                <Field label={t('ai.monthlyLimit')}><Input type="number" min={0} step={100000} value={form.monthlyTokenLimit} onChange={(e) => set({ monthlyTokenLimit: Number(e.target.value) })} /></Field>
              </div>
            </Card>
            <Card>
              <CardHeader title={t('ai.capabilities')} icon={<ShieldCheck className="size-4" />} />
              <div className="space-y-3 px-5 pb-5">
                {(
                  [
                    ['allowSuggest', t('ai.suggest')],
                    ['allowImprove', t('ai.improve')],
                    ['allowExplain', t('ai.explain')],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center justify-between rounded-xl bg-surface-2/60 px-4 py-3 text-[13px] font-medium ring-1 ring-border">
                    <span className="flex items-center gap-2"><Sparkles className="size-4 text-brand" />{label}</span>
                    <Switch checked={form[k]} onCheckedChange={(v) => set({ [k]: v } as Partial<AISettingsInput>)} />
                  </label>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label={`${t('ai.requests')} · ${t('ai.thisMonth')}`} value={usage.data?.month.requests.toLocaleString() ?? '—'} icon={<Activity className="size-4" />} />
            <StatCard label={`${t('ai.tokens')} · ${t('ai.thisMonth')}`} value={usage.data ? `${(usage.data.month.tokens / 1000).toFixed(1)}k` : '—'} icon={<Gauge className="size-4" />} tone="info" />
          </div>
          <Card>
            <CardHeader title={t('ai.usage')} />
            <div className="h-56 px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usage.data?.series ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="aiUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, locale, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} reversed={locale === 'ar'} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} labelFormatter={(d) => formatDate(d as string, locale)} />
                  <Area type="monotone" dataKey="requests" name={t('ai.requests')} stroke="var(--series-1)" strokeWidth={2} fill="url(#aiUsage)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardHeader title={t('ai.topUsers')} />
            <div className="space-y-1 px-3 pb-4">
              {usage.data?.topUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Avatar name={u.name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{u.name}</p>
                    <p className="text-[11px] text-muted">{u.role ? t(`roles.${u.role}`) : ''}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{u.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
