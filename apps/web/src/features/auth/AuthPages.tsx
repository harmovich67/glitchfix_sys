import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, Quote, UserRound, Building2 } from 'lucide-react';
import { forgotPasswordSchema, loginSchema, registerSchema, type ForgotPasswordInput, type LoginInput, type RegisterInput } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePublicSettings } from '../../lib/brand';
import type { User } from '../../lib/types';
import { Button } from '../../components/ui/button';
import { Field, Input } from '../../components/ui/form';
import { Logo } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Preferences';
import { StylePreview } from '../wizard/previews';

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
        >
          <h1 className="text-[28px] font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted">{footer}</p>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#0c0c1a] lg:block">
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-brand/40 blur-[120px]" />
        <div className="absolute -bottom-48 -left-24 size-[480px] rounded-full bg-accent/30 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-semibold">{t('auth.panelTitle')}</h2>
            <p className="mt-4 max-w-md text-white/65">{t('auth.panelBody')}</p>
          </div>
          <div className="relative mx-auto grid w-full max-w-md grid-cols-3 gap-3">
            {(['luxury', 'modern', 'dark', 'minimal', 'creative', 'corporate'] as const).map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="animate-float overflow-hidden rounded-xl ring-1 ring-white/15 shadow-2xl"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <StylePreview style={s} />
              </motion.div>
            ))}
          </div>
          <figure className="glass rounded-2xl !bg-white/8 p-6 ring-1 ring-white/10">
            <Quote className="size-5 text-white/40" />
            <blockquote className="mt-3 text-[15px] leading-relaxed">{t('auth.quote')}</blockquote>
            <figcaption className="mt-3 text-sm text-white/55">{t('auth.quoteBy')}</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

function useAfterAuth() {
  const { setUser } = useAuth();
  const { setLocale } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return (user: User, fallback = '/app') => {
    setUser(user);
    setLocale(user.locale);
    const next = params.get('next');
    navigate(next && next.startsWith('/app') ? next : fallback, { replace: true });
  };
}

export function LoginPage() {
  const { t } = useI18n();
  const demoLogins = usePublicSettings().data?.demoAccounts ?? [];
  const after = useAfterAuth();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const login = useMutation({
    mutationFn: (v: LoginInput) => api.post<{ user: User }>('/auth/login', v),
    onSuccess: (r) => after(r.user),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AuthLayout
      title={t('auth.welcomeBack')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            {t('auth.register')}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
        <Field label={t('auth.email')} error={form.formState.errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" icon={<Mail className="size-4" />} {...form.register('email')} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="password" className="font-medium text-fg-2">{t('auth.password')}</label>
            <Link to="/forgot-password" className="font-medium text-brand hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" icon={<Lock className="size-4" />} {...form.register('password')} />
          {form.formState.errors.password?.message && (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
          {t('auth.login')}
        </Button>
      </form>

      {demoLogins.length > 0 && (
        <div className="mt-8 rounded-2xl bg-surface-2/70 p-4 ring-1 ring-border">
          <p className="text-xs font-semibold text-fg-2">{t('auth.demoAccounts')}</p>
          <p className="mt-0.5 text-[11px] text-muted">{t('auth.demoHint')}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {demoLogins.map(({ email, role }) => (
              <button
                key={email}
                type="button"
                onClick={() => {
                  form.setValue('email', email);
                  form.setValue('password', 'Welco123!');
                  login.mutate({ email, password: 'Welco123!' });
                }}
                className="rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-medium text-fg-2 ring-1 ring-border transition hover:text-brand hover:ring-brand/40"
              >
                {t(`roles.${role}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { t, locale } = useI18n();
  const after = useAfterAuth();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', companyName: '', locale },
  });
  const register = useMutation({
    mutationFn: async (v: RegisterInput) => {
      const { user } = await api.post<{ user: User }>('/auth/register', { ...v, locale });
      const project = await api.post<{ id: string }>('/projects', { title: v.companyName ? `${v.companyName} project` : undefined });
      return { user, project };
    },
    onSuccess: ({ user, project }) => after(user, `/app/projects/${project.id}/journey`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AuthLayout
      title={t('auth.createTitle')}
      subtitle={t('auth.createSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t('auth.login')}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit((v) => register.mutate(v))} className="space-y-4" noValidate>
        <Field label={t('auth.name')} error={form.formState.errors.name?.message} htmlFor="name">
          <Input id="name" autoComplete="name" icon={<UserRound className="size-4" />} {...form.register('name')} />
        </Field>
        <Field label={t('auth.company')} htmlFor="company">
          <Input id="company" autoComplete="organization" icon={<Building2 className="size-4" />} {...form.register('companyName')} />
        </Field>
        <Field label={t('auth.email')} error={form.formState.errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" icon={<Mail className="size-4" />} {...form.register('email')} />
        </Field>
        <Field label={t('auth.password')} error={form.formState.errors.password?.message} hint={t('auth.passwordHint')} htmlFor="password">
          <Input id="password" type="password" autoComplete="new-password" icon={<Lock className="size-4" />} {...form.register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
          {t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const requestReset = useMutation({
    mutationFn: (v: ForgotPasswordInput) => api.post('/auth/forgot-password', v),
    onSuccess: () => {
      setSent(true);
      toast.success(t('auth.resetLinkSent'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AuthLayout
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline inline-flex items-center gap-1.5">
          <ArrowRight className="rtl-flip size-3.5 rotate-180" />
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4 rounded-2xl bg-surface-2/60 p-6 text-center ring-1 ring-border">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-success/20">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-fg-2">{t('auth.resetLinkSent')}</p>
          <div className="pt-2">
            <Button variant="secondary" className="w-full" asChild>
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => requestReset.mutate(v))} className="space-y-4" noValidate>
          <Field label={t('auth.email')} error={form.formState.errors.email?.message} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" icon={<Mail className="size-4" />} {...form.register('email')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={requestReset.isPending} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
            {t('auth.sendResetLink')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [confirmPassword, setConfirmPassword] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const reset = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { token, password }),
    onSuccess: () => {
      setDone(true);
      toast.success(t('auth.resetSuccess'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    setError('');
    reset.mutate();
  };

  if (!token) {
    return (
      <AuthLayout
        title={t('auth.resetPasswordTitle')}
        subtitle={t('auth.invalidResetLink')}
        footer={<Link to="/login" className="font-medium text-brand hover:underline">{t('auth.backToLogin')}</Link>}
      >
        <div className="space-y-4 rounded-2xl bg-danger-soft/40 p-6 text-center ring-1 ring-danger/20">
          <p className="text-sm text-danger">{t('auth.invalidResetLink')}</p>
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/forgot-password">{t('auth.sendResetLink')}</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
      footer={<Link to="/login" className="font-medium text-brand hover:underline">{t('auth.backToLogin')}</Link>}
    >
      {done ? (
        <div className="space-y-4 rounded-2xl bg-surface-2/60 p-6 text-center ring-1 ring-border">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-success/20">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-fg-2">{t('auth.resetSuccess')}</p>
          <div className="pt-2">
            <Button className="w-full" onClick={() => navigate('/login')}>
              {t('auth.login')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')} htmlFor="newPassword">
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              icon={<Lock className="size-4" />}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </Field>
          <Field label={t('auth.confirmPassword')} htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              icon={<KeyRound className="size-4" />}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={reset.isPending} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
            {t('auth.resetPasswordBtn')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
