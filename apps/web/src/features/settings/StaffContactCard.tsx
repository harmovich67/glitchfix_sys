import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Contact } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { User } from '../../lib/types';
import { Button } from '../../components/ui/button';
import { Field, Input } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';

const KEYS = ['phone', 'whatsapp', 'altEmail', 'emergencyName', 'emergencyPhone'] as const;
type Form = Record<(typeof KEYS)[number], string>;

const fromUser = (u: User | null): Form => Object.fromEntries(KEYS.map((k) => [k, u?.[k] ?? ''])) as Form;

/** Where the team can reach you — shown to admins and to whoever reviews your leave and permission requests. */
export function StaffContactCard() {
  const { t } = useI18n();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState<Form>(() => fromUser(user));
  useEffect(() => setForm(fromUser(user)), [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api.patch<{ user: User }>('/auth/me', form),
    onSuccess: (r) => {
      setUser(r.user);
      toast.success(t('settings.profileSaved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const dirty = KEYS.some((k) => form[k] !== (user?.[k] ?? ''));
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader title={t('timeoff.contactCard.title')} description={t('timeoff.contactCard.subtitle')} icon={<Contact className="size-4" />} />
      <div className="space-y-4 px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('timeoff.contactCard.phone')}><Input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} placeholder="+20 100 000 0000" maxLength={40} /></Field>
          <Field label={t('timeoff.contactCard.whatsapp')}><Input type="tel" dir="ltr" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+20 100 000 0000" maxLength={40} /></Field>
          <Field label={t('timeoff.contactCard.altEmail')} className="sm:col-span-2"><Input type="email" dir="ltr" value={form.altEmail} onChange={set('altEmail')} maxLength={120} /></Field>
          <Field label={t('timeoff.contactCard.emergencyName')}><Input value={form.emergencyName} onChange={set('emergencyName')} maxLength={80} /></Field>
          <Field label={t('timeoff.contactCard.emergencyPhone')}><Input type="tel" dir="ltr" value={form.emergencyPhone} onChange={set('emergencyPhone')} maxLength={40} /></Field>
        </div>
        <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>
      </div>
    </Card>
  );
}
