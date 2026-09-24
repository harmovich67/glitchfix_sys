import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, FileText, FolderKanban, Globe, Mail, MessagesSquare, Phone, Save } from 'lucide-react';
import type { Priority, ProjectStatus } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { User } from '../../lib/types';
import { countryName, flag, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, Textarea } from '../../components/ui/form';
import { Card, CardHeader, PriorityBadge, StatCard, StatusBadge } from '../../components/ui/surfaces';
import { Avatar, PageLoader, Progress } from '../../components/ui/feedback';
import { TypeTile } from '../projects/components';

interface ClientDetail extends User {
  projects: { id: string; code: string; title: string; status: ProjectStatus; priority: Priority; projectType: string | null; progress: number; createdAt: string; submittedAt: string | null }[];
  stats: { messages: number; files: number };
}

export default function ClientDetailPage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const client = useQuery({ queryKey: ['client', id], queryFn: () => api.get<ClientDetail>(`/clients/${id}`) });
  const [profile, setProfile] = useState({ companyName: '', industry: '', phone: '', website: '', internalNotes: '' });

  useEffect(() => {
    const p = client.data?.clientProfile;
    if (p) setProfile({ companyName: p.companyName ?? '', industry: p.industry ?? '', phone: p.phone ?? '', website: p.website ?? '', internalNotes: p.internalNotes ?? '' });
  }, [client.data]);

  const save = useMutation({
    mutationFn: () => api.patch<ClientDetail>(`/clients/${id}`, profile),
    onSuccess: (c) => {
      qc.setQueryData(['client', id], c);
      toast.success(t('common.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!client.data) return <PageLoader />;
  const c = client.data;
  const editable = can('projects.manage');

  return (
    <>
      <Link to="/app/clients" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="rtl-flip size-4" /> {t('clients.title')}
      </Link>
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={c.clientProfile?.companyName || c.name} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold">{c.clientProfile?.companyName || c.name}</h1>
          <p className="text-sm text-muted">{c.name} · {t('clients.joined')} {formatDate(c.createdAt, locale)}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('clients.projects')} value={c.projects.length} icon={<FolderKanban className="size-4" />} />
        <StatCard label={t('clients.messages')} value={c.stats.messages} icon={<MessagesSquare className="size-4" />} tone="info" />
        <StatCard label={t('clients.files')} value={c.stats.files} icon={<FileText className="size-4" />} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader title={t('clients.history')} />
          <div className="divide-y divide-border">
            {c.projects.map((p) => (
              <Link key={p.id} to={`/app/projects/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/60">
                <TypeTile type={p.projectType} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                  <p className="font-mono text-[11px] text-muted">{p.code} · {formatDate(p.createdAt, locale)}</p>
                </div>
                <div className="hidden w-28 sm:block"><Progress value={p.progress} /></div>
                <PriorityBadge priority={p.priority} />
                <StatusBadge status={p.status} short />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('clients.profile')} action={editable && <Button size="sm" loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="size-4" />}>{t('common.save')}</Button>} />
          <div className="space-y-4 px-5 pb-5">
            <div className="space-y-2 rounded-xl bg-surface-2/60 p-4 text-[13px] ring-1 ring-border">
              <p className="flex items-center gap-2"><Mail className="size-4 text-muted" />{c.email}</p>
              {c.clientProfile?.country && <p className="flex items-center gap-2"><Globe className="size-4 text-muted" />{flag(c.clientProfile.country)} {countryName(c.clientProfile.country, locale)}</p>}
              {c.clientProfile?.phone && <p className="flex items-center gap-2" dir="ltr"><Phone className="size-4 text-muted" />{c.clientProfile.phone}</p>}
            </div>
            <Field label={t('clients.company')}><Input disabled={!editable} value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('clients.industry')}><Input disabled={!editable} value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} /></Field>
              <Field label={t('clients.phone')}><Input disabled={!editable} dir="ltr" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            </div>
            <Field label={t('clients.website')}><Input disabled={!editable} dir="ltr" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} /></Field>
            <Field label={t('clients.internalNotes')}>
              <Textarea disabled={!editable} value={profile.internalNotes} placeholder={t('clients.notesPlaceholder')} onChange={(e) => setProfile({ ...profile, internalNotes: e.target.value })} />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
