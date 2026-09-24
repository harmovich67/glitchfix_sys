import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Contact, MoreHorizontal, Power, Shield, UserPlus, X } from 'lucide-react';
import { PERMISSIONS, ROLES, STAFF_ROLES, can, type Role } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { User } from '../../lib/types';
import { cn, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, Select } from '../../components/ui/form';
import { Badge, Card, CardHeader, PageHeader } from '../../components/ui/surfaces';
import { Avatar, Skeleton } from '../../components/ui/feedback';
import { Menu, Modal } from '../../components/ui/overlay';

type TeamUser = User & { _count: { projects: number; memberships: number } };

export default function TeamPage() {
  const { t, locale } = useI18n();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contactOf, setContactOf] = useState<TeamUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'DEVELOPER' as Role, password: '', title: '', skills: '' });
  const team = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamUser[]>('/users') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['team'] });

  const create = useMutation({
    mutationFn: () =>
      api.post('/users', {
        ...form,
        title: form.title || undefined,
        skills: form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      }),
    onSuccess: () => {
      toast.success(t('team.created'));
      setOpen(false);
      setForm({ name: '', email: '', role: 'DEVELOPER', password: '', title: '', skills: '' });
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: Role; isActive?: boolean }) => api.patch(`/users/${id}`, body),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const assignableRoles = STAFF_ROLES.filter((r) => me?.role === 'SUPER_ADMIN' || r !== 'SUPER_ADMIN');

  return (
    <>
      <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} actions={<Button onClick={() => setOpen(true)} leftIcon={<UserPlus className="size-4" />}>{t('team.invite')}</Button>} />
      <Card className="mb-6 overflow-hidden">
        {team.isLoading ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">{t('auth.name')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('team.role')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('nav.projects')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('team.lastLogin')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('common.status')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.data?.map((u) => (
                  <tr key={u.id} className={cn(!u.isActive && 'opacity-55')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name} {u.id === me?.id && <span className="text-xs text-muted">({t('common.you')})</span>}</p>
                          <p className="truncate text-xs text-muted">{u.developerProfile?.title ? `${u.developerProfile.title} · ` : ''}{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Badge className={u.role === 'SUPER_ADMIN' ? 'bg-brand-soft text-brand ring-brand/20' : undefined}>{t(`roles.${u.role}`)}</Badge></td>
                    <td className="px-3 py-3 tabular-nums">{u._count.memberships}</td>
                    <td className="px-3 py-3 text-[13px] text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt, locale) : t('team.never')}</td>
                    <td className="px-3 py-3">
                      <Badge className={u.isActive ? 'bg-success-soft text-success ring-success/20' : undefined} dot={u.isActive ? 'bg-success' : 'bg-muted'}>
                        {u.isActive ? t('team.active') : t('team.inactive')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-end">
                      {u.id !== me?.id && (me?.role === 'SUPER_ADMIN' || u.role !== 'SUPER_ADMIN') && (
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label={t('common.actions')}><MoreHorizontal className="size-4" /></Button>
                          </Menu.Trigger>
                          <Menu.Content>
                            <Menu.Item icon={<Contact />} onSelect={() => setContactOf(u)}>{t('timeoff.contactCard.view')}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Label>{t('team.role')}</Menu.Label>
                            {assignableRoles.map((r) => (
                              <Menu.Item key={r} icon={u.role === r ? <Check /> : <Shield />} onSelect={() => update.mutate({ id: u.id, role: r })}>{t(`roles.${r}`)}</Menu.Item>
                            ))}
                            <Menu.Separator />
                            <Menu.Item icon={<Power />} danger={u.isActive} onSelect={() => update.mutate({ id: u.id, isActive: !u.isActive })}>
                              {u.isActive ? t('team.deactivate') : t('team.activate')}
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Root>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={t('team.permissions')} icon={<Shield className="size-4" />} />
        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-5 py-2.5 text-start font-medium" />
                {ROLES.map((r) => <th key={r} className="px-3 py-2.5 text-center font-medium">{t(`roles.${r}`)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSIONS.map((p) => (
                <tr key={p}>
                  <td className="px-5 py-2 font-mono text-xs text-fg-2">{p}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      {can(r, p) ? <Check className="mx-auto size-4 text-success" /> : <X className="mx-auto size-3.5 text-muted/40" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!contactOf}
        onOpenChange={(o) => !o && setContactOf(null)}
        size="sm"
        title={contactOf?.name ?? ''}
        description={contactOf ? `${t(`roles.${contactOf.role}`)} · ${contactOf.email}` : undefined}
      >
        {contactOf && (
          <dl className="space-y-3 text-sm">
            {([
              ['phone', contactOf.phone],
              ['whatsapp', contactOf.whatsapp],
              ['altEmail', contactOf.altEmail],
              ['emergencyName', contactOf.emergencyName],
              ['emergencyPhone', contactOf.emergencyPhone],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">{t(`timeoff.contactCard.${k}`)}</dt>
                <dd dir="ltr" className="font-medium text-fg [overflow-wrap:anywhere]">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('team.invite')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={create.isPending} disabled={!form.name || !form.email || form.password.length < 8} onClick={() => create.mutate()}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t('auth.email')}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={t('team.role')}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {assignableRoles.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('team.tempPassword')} hint={t('auth.passwordHint')}><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {form.role === 'DEVELOPER' && (
            <>
              <Field label={t('team.jobTitle')}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label={t('team.skills')}><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
