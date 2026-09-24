import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowRight, Lock, Mail, Quote, UserRound, Building2 } from 'lucide-react';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@welco/shared';
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
        <Field label={t('auth.password')} error={form.formState.errors.password?.message} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" icon={<Lock className="size-4" />} {...form.register('password')} />
        </Field>
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
