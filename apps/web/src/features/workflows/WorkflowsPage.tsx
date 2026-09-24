import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Copy, MoreHorizontal, Plus, Star, Trash2, Workflow } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { WorkflowFull, WorkflowSummary } from '../../lib/types';
import { timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, Textarea } from '../../components/ui/form';
import { Badge, Card, PageHeader } from '../../components/ui/surfaces';
import { EmptyState, Skeleton } from '../../components/ui/feedback';
import { Menu, Modal } from '../../components/ui/overlay';

export default function WorkflowsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const list = useQuery({ queryKey: ['workflows'], queryFn: () => api.get<WorkflowSummary[]>('/workflows') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['workflows'] });
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const create = useMutation({
    mutationFn: () => api.post<WorkflowFull>('/workflows', { name, description }),
    onSuccess: (wf) => {
      refresh();
      navigate(`/app/workflows/${wf.id}`);
    },
    onError,
  });
  const duplicate = useMutation({ mutationFn: (id: string) => api.post(`/workflows/${id}/duplicate`), onSuccess: refresh, onError });
  const setDefault = useMutation({ mutationFn: (id: string) => api.post(`/workflows/${id}/default`), onSuccess: refresh, onError });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/workflows/${id}`), onSuccess: refresh, onError });

  return (
    <>
      <PageHeader
        title={t('workflows.title')}
        subtitle={t('workflows.subtitle')}
        actions={<Button onClick={() => setOpen(true)} leftIcon={<Plus className="size-4" />}>{t('workflows.newTemplate')}</Button>}
      />
      {list.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : !list.data?.length ? (
        <Card><EmptyState icon={<Workflow className="size-6" />} title={t('workflows.newTemplate')} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((wf, i) => (
            <motion.div key={wf.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group relative h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-md">
                    <Workflow className="size-5" />
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    {wf.isDefault && <Badge className="bg-brand-soft text-brand ring-brand/20"><Star className="size-3" />{t('workflows.default')}</Badge>}
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={t('common.actions')}><MoreHorizontal className="size-4" /></Button>
                      </Menu.Trigger>
                      <Menu.Content>
                        {!wf.isDefault && <Menu.Item icon={<Star />} onSelect={() => setDefault.mutate(wf.id)}>{t('workflows.setDefault')}</Menu.Item>}
                        <Menu.Item icon={<Copy />} onSelect={() => duplicate.mutate(wf.id)}>{t('workflows.duplicate')}</Menu.Item>
                        {!wf.isDefault && (
                          <>
                            <Menu.Separator />
                            <Menu.Item icon={<Trash2 />} danger onSelect={() => remove.mutate(wf.id)}>{t('common.delete')}</Menu.Item>
                          </>
                        )}
                      </Menu.Content>
                    </Menu.Root>
                  </div>
                </div>
                <Link to={`/app/workflows/${wf.id}`} className="mt-4 block text-[15px] font-semibold after:absolute after:inset-0">
                  {wf.name}
                </Link>
                {wf.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{wf.description}</p>}
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    [wf.enabledSteps, t('workflows.steps')],
                    [wf.questionCount, t('workflows.questions')],
                    [wf.projectCount, t('nav.projects')],
                  ].map(([n, l]) => (
                    <div key={String(l)} className="rounded-xl bg-surface-2/70 py-2.5">
                      <p className="text-lg font-semibold tabular-nums">{n}</p>
                      <p className="text-[11px] text-muted">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted">
                  {t('workflows.version', { n: wf.version })} · {t('projects.lastUpdate', { time: timeAgo(wf.updatedAt, locale) })}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('workflows.newTemplate')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={name.trim().length < 2} loading={create.isPending} onClick={() => create.mutate()}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('workflows.fieldTitle')}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <Field label={t('workflows.description')}><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" /></Field>
        </div>
      </Modal>
    </>
  );
}
