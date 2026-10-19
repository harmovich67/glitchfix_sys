import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Globe, KeyRound, Lock, MessageSquareWarning, Send, ShieldCheck } from 'lucide-react';
import { FIX_PLATFORMS, PRIORITIES, createFixRequestSchema, updateFixRequestSchema, type FixPlatform, type Priority } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { ProjectDetail } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/form';

interface FormState {
  title: string;
  siteUrl: string;
  platform: FixPlatform | '';
  loginUrl: string;
  username: string;
  password: string;
  extraAccess: string;
  problem: string;
  history: string;
  urgency: Priority;
  consent: boolean;
}

type Errors = Partial<Record<keyof FormState, string>>;

function Section({ icon, title, children, hint }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand [&>svg]:size-4">{icon}</span>
        <div>
          <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
          {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SecretInput({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder?: string; id?: string }) {
  const [shown, setShown] = useState(false);
  return (
    // Passwords are typed left-to-right, so the field (and its toggle) stay LTR in Arabic too.
    <div className="relative" dir="ltr">
      <Input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pe-10"
      />
      <button type="button" onClick={() => setShown((s) => !s)} className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted hover:text-fg" tabIndex={-1}>
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/**
 * The client's repair request: their site, the problem in their own words and (optionally) the access we need.
 * Creating one sends it straight to the team with an AI triage; editing keeps stored secrets unless retyped.
 */
export function FixRequestForm({ project, onDone }: { project?: ProjectDetail; onDone?: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fix = project?.fixRequest;
  const editing = !!fix;

  const [form, setForm] = useState<FormState>(() => ({
    title: project?.title ?? '',
    siteUrl: fix?.siteUrl ?? '',
    platform: fix?.platform ?? '',
    loginUrl: fix?.loginUrl ?? '',
    username: fix?.username ?? '',
    password: '',
    extraAccess: '',
    problem: fix?.problem ?? '',
    history: fix?.history ?? '',
    urgency: fix?.urgency ?? 'MEDIUM',
    consent: false,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const sharingSecrets = !!(form.password || form.extraAccess.trim());

  const payload = () => ({
    title: form.title.trim(),
    siteUrl: form.siteUrl.trim(),
    platform: form.platform || undefined,
    loginUrl: form.loginUrl.trim(),
    username: form.username.trim(),
    ...(form.password ? { password: form.password } : {}),
    ...(form.extraAccess.trim() ? { extraAccess: form.extraAccess.trim() } : {}),
    problem: form.problem.trim(),
    history: form.history.trim(),
    urgency: form.urgency,
    consent: form.consent,
  });

  const messages: Errors = {
    title: t('common.required'),
    siteUrl: t('fix.siteUrlInvalid'),
    loginUrl: t('fix.siteUrlInvalid'),
    problem: t('fix.problemShort'),
    consent: t('fix.consentRequired'),
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = payload();
      const parsed = (editing ? updateFixRequestSchema : createFixRequestSchema).safeParse(body);
      if (!parsed.success) {
        const fields = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
        const next: Errors = {};
        for (const k of Object.keys(fields) as (keyof FormState)[]) next[k] = messages[k] ?? fields[k]?.[0];
        setErrors(next);
        throw new Error('invalid');
      }
      return editing
        ? { kind: 'edit' as const, project: await api.patch<ProjectDetail>(`/projects/${project!.id}/fix`, body) }
        : { kind: 'create' as const, created: await api.post<{ id: string; analyzed: boolean }>('/projects/fix', body) };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (r.kind === 'edit') {
        qc.setQueryData(['project', r.project.id], r.project);
        qc.invalidateQueries({ queryKey: ['timeline', r.project.id] });
        toast.success(t('fix.savedOk'));
        onDone?.();
      } else {
        toast.success(t('fix.sent'));
        navigate(`/app/projects/${r.created.id}`);
      }
    },
    onError: (e) => {
      if ((e as Error).message !== 'invalid') toast.error(errorMessage(e));
    },
  });

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Section icon={<Globe />} title={t('fix.sectionSite')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fix.siteUrl')} required error={errors.siteUrl} htmlFor="fix-site">
            <Input id="fix-site" dir="ltr" inputMode="url" placeholder={t('fix.siteUrlPlaceholder')} value={form.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} aria-invalid={!!errors.siteUrl} />
          </Field>
          <Field label={t('fix.platform')} hint={t('fix.platformHint')} htmlFor="fix-platform">
            <Select id="fix-platform" value={form.platform} onChange={(e) => set('platform', e.target.value as FixPlatform | '')}>
              <option value="">—</option>
              {FIX_PLATFORMS.map((p) => (
                <option key={p} value={p}>{t(`fix.platforms.${p}`)}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section icon={<MessageSquareWarning />} title={t('fix.sectionProblem')}>
        <Field label={t('fix.title')} required error={errors.title} htmlFor="fix-title">
          <Input id="fix-title" maxLength={120} placeholder={t('fix.titlePlaceholder')} value={form.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
        </Field>
        <Field label={t('fix.problem')} required hint={t('fix.problemHint')} error={errors.problem} htmlFor="fix-problem">
          <Textarea id="fix-problem" rows={6} maxLength={8000} placeholder={t('fix.problemPlaceholder')} value={form.problem} onChange={(e) => set('problem', e.target.value)} aria-invalid={!!errors.problem} />
        </Field>
        <Field label={t('fix.history')} htmlFor="fix-history">
          <Textarea id="fix-history" rows={3} maxLength={4000} className="min-h-20" placeholder={t('fix.historyPlaceholder')} value={form.history} onChange={(e) => set('history', e.target.value)} />
        </Field>
        <Field label={t('fix.urgency')}>
          <div className="grid gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set('urgency', p)}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-start text-[13px] font-medium ring-1 ring-inset transition-colors',
                  form.urgency === p ? 'bg-brand-soft text-brand ring-brand/40' : 'bg-surface text-fg-2 ring-border hover:ring-border-strong',
                )}
              >
                {t(`fix.urgencyOptions.${p}`)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section icon={<KeyRound />} title={t('fix.sectionAccess')} hint={t('fix.accessIntro')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fix.loginUrl')} error={errors.loginUrl} htmlFor="fix-login" className="sm:col-span-2">
            <Input id="fix-login" dir="ltr" inputMode="url" placeholder={t('fix.loginUrlPlaceholder')} value={form.loginUrl} onChange={(e) => set('loginUrl', e.target.value)} aria-invalid={!!errors.loginUrl} />
          </Field>
          <Field label={t('fix.username')} htmlFor="fix-user">
            <Input id="fix-user" dir="ltr" autoComplete="off" value={form.username} onChange={(e) => set('username', e.target.value)} />
          </Field>
          <Field label={t('fix.password')} hint={fix?.hasPassword ? t('fix.passwordKeep') : undefined} htmlFor="fix-pass">
            <SecretInput id="fix-pass" value={form.password} onChange={(v) => set('password', v)} placeholder={fix?.hasPassword ? '••••••••' : undefined} />
          </Field>
          <Field label={t('fix.extraAccess')} hint={fix?.hasExtraAccess ? t('fix.passwordKeep') : undefined} htmlFor="fix-extra" className="sm:col-span-2">
            <Textarea id="fix-extra" dir="auto" rows={3} className="min-h-20" maxLength={4000} placeholder={t('fix.extraAccessPlaceholder')} value={form.extraAccess} onChange={(e) => set('extraAccess', e.target.value)} />
          </Field>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-[12.5px] text-muted ring-1 ring-border">
          <Lock className="mt-0.5 size-3.5 shrink-0" /> {t('fix.tip')}
        </p>
        {sharingSecrets && (
          <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl px-3.5 py-3 ring-1 ring-inset', errors.consent ? 'bg-danger/5 ring-danger/40' : 'bg-success-soft/40 ring-success/25')}>
            <Checkbox checked={form.consent} onCheckedChange={(v) => set('consent', v)} className="mt-0.5" />
            <span className="text-[13px] text-fg-2">
              <ShieldCheck className="me-1 inline size-4 text-success" />
              {t('fix.consent')}
              {errors.consent && <span className="mt-1 block text-xs text-danger">{errors.consent}</span>}
            </span>
          </label>
        )}
      </Section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" size={editing ? 'md' : 'lg'} loading={save.isPending} leftIcon={<Send className="rtl-flip size-4" />}>
          {save.isPending && !editing ? t('fix.submitting') : editing ? t('fix.saveChanges') : t('fix.submit')}
        </Button>
      </div>
    </form>
  );
}
