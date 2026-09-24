import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, LogOut, Monitor, Moon, Palette, Server, Sun, UserRound } from 'lucide-react';
import type { PlatformSettings } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth, useLocaleSwitch } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import type { User } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, Switch } from '../../components/ui/form';
import { Card, CardHeader, PageHeader } from '../../components/ui/surfaces';
import { Avatar } from '../../components/ui/feedback';

import { ContactSettingsCard } from './ContactSettingsCard';
import { StaffContactCard } from './StaffContactCard';

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const { user, setUser, can, isClient } = useAuth();
  const { theme, setTheme } = useTheme();
  const switchLocale = useLocaleSwitch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = useMutation({
    mutationFn: (body: Record<string, string>) => api.patch<{ user: User }>('/auth/me', body),
    onSuccess: (r, body) => {
      setUser(r.user);
      if (body.newPassword) {
        setPw({ currentPassword: '', newPassword: '' });
        toast.success(t('settings.passwordChanged'));
      } else toast.success(t('settings.profileSaved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const logoutAll = useMutation({
    mutationFn: () => api.post('/auth/logout-all'),
    onSuccess: () => {
      qc.clear();
      navigate('/login');
    },
  });

  const platform = useQuery({ queryKey: ['settings'], queryFn: () => api.get<PlatformSettings>('/settings'), enabled: can('settings.manage') });
  const savePlatform = useMutation({
    mutationFn: (s: PlatformSettings) => api.put<PlatformSettings>('/settings', s),
    onSuccess: (s) => {
      qc.setQueryData(['settings'], s);
      qc.invalidateQueries({ queryKey: ['settings', 'public'] });
      toast.success(t('common.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('settings.profile')} icon={<UserRound className="size-4" />} />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name ?? '?'} size="lg" />
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted">{user?.email} · {user && t(`roles.${user.role}`)}</p>
              </div>
            </div>
            <Field label={t('auth.name')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button disabled={name.trim().length < 2 || name === user?.name} loading={saveProfile.isPending} onClick={() => saveProfile.mutate({ name })}>{t('common.save')}</Button>
          </div>
        </Card>

        {!isClient && <StaffContactCard />}

        <Card>
          <CardHeader title={t('settings.appearance')} icon={<Palette className="size-4" />} />
          <div className="space-y-5 px-5 pb-5">
            <Field label={t('common.theme')}>
              <div className="grid grid-cols-3 gap-2">
                {([['light', Sun], ['dark', Moon], ['system', Monitor]] as const).map(([v, Icon]) => (
                  <button key={v} onClick={() => setTheme(v)} className={cn('flex flex-col items-center gap-2 rounded-xl p-4 text-[13px] font-medium ring-1 transition', theme === v ? 'bg-brand-soft text-brand ring-2 ring-brand' : 'ring-border hover:ring-border-strong')}>
                    <Icon className="size-5" /> {t(`common.${v}`)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('common.language')}>
              <div className="grid grid-cols-2 gap-2">
                {([['en', 'English', 'LTR'], ['ar', 'العربية', 'RTL']] as const).map(([v, label, d]) => (
                  <button key={v} onClick={() => switchLocale(v)} className={cn('rounded-xl p-4 text-start ring-1 transition', locale === v ? 'bg-brand-soft ring-2 ring-brand' : 'ring-border hover:ring-border-strong')}>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted">{d}</p>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.security')} icon={<KeyRound className="size-4" />} />
          <div className="space-y-4 px-5 pb-5">
            <Field label={t('settings.currentPassword')}><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!pw.currentPassword || pw.newPassword.length < 8} loading={saveProfile.isPending} onClick={() => saveProfile.mutate(pw)}>{t('settings.changePassword')}</Button>
              <Button variant="ghost" leftIcon={<LogOut className="size-4" />} loading={logoutAll.isPending} onClick={() => logoutAll.mutate()}>{t('settings.logoutAll')}</Button>
            </div>
          </div>
        </Card>

        {can('settings.manage') && platform.data && (
          <Card>
            <CardHeader title={t('settings.platform')} icon={<Server className="size-4" />} />
            <div className="space-y-3 px-5 pb-5">
              <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-2/60 px-4 py-3 ring-1 ring-border">
                <span className="text-[13px] font-medium">{t('settings.registration')}</span>
                <Switch checked={platform.data.allowClientRegistration} onCheckedChange={(v) => savePlatform.mutate({ ...platform.data!, allowClientRegistration: v })} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-2/60 px-4 py-3 ring-1 ring-border">
                <span>
                  <span className="block text-[13px] font-medium">{t('settings.emailNotifications')}</span>
                  <span className="block text-xs text-muted">{t('settings.emailHint')}</span>
                </span>
                <Switch checked={platform.data.emailNotifications} onCheckedChange={(v) => savePlatform.mutate({ ...platform.data!, emailNotifications: v })} />
              </label>
            </div>
          </Card>
        )}

        {can('settings.manage') && platform.data && (
          <ContactSettingsCard
            settings={platform.data}
            onSave={(updated) => savePlatform.mutate(updated)}
            isPending={savePlatform.isPending}
          />
        )}
      </div>
    </>
  );
}
