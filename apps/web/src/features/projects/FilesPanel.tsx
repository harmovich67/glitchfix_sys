import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Download, Eye, FileText, FolderOpen, Lock, Trash2, UploadCloud } from 'lucide-react';
import { FILE_CATEGORIES } from '@welco/shared';
import { api, errorMessage, fileUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { FileItem, ProjectDetail } from '../../lib/types';
import { cn, formatBytes, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Select, Switch } from '../../components/ui/form';
import { Badge, Card, CardHeader } from '../../components/ui/surfaces';
import { EmptyState, Progress } from '../../components/ui/feedback';

function FileCard({ f, canDelete, onDelete }: { f: FileItem; canDelete: boolean; onDelete: () => void }) {
  const { t, locale } = useI18n();
  const image = /^image\/(png|jpe?g|webp|gif)$/.test(f.mimeType);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group overflow-hidden rounded-2xl bg-surface ring-1 ring-border transition-shadow hover:shadow-md">
      <a href={fileUrl(f.id, image)} target={image ? '_blank' : undefined} rel="noreferrer" className="relative block aspect-[16/10] overflow-hidden bg-surface-2">
        {image ? (
          <img src={fileUrl(f.id, true)} alt={f.originalName} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center text-muted">
            <FileText className="size-8" />
            <span className="mt-2 font-mono text-[11px] uppercase">{f.originalName.split('.').pop()}</span>
          </div>
        )}
        <div className="absolute start-2.5 top-2.5 flex gap-1.5">
          {f.category === 'PREVIEW' && <Badge className="bg-brand text-white ring-brand">{t('files.categories.PREVIEW')}</Badge>}
          {f.visibility === 'INTERNAL' && <Badge className="bg-fg/80 text-bg ring-transparent"><Lock className="size-3" />{t('files.internal')}</Badge>}
        </div>
      </a>
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg" title={f.originalName}>{f.originalName}</p>
          <p className="truncate text-[11px] text-muted">
            {t(`files.categories.${f.category}`)} · {formatBytes(f.size)} · {timeAgo(f.createdAt, locale)}
          </p>
        </div>
        <Button asChild size="icon-sm" variant="ghost" aria-label={t('common.download')}>
          <a href={fileUrl(f.id)}><Download className="size-4" /></a>
        </Button>
        {canDelete && (
          <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label={t('common.delete')} className="text-muted hover:text-danger">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function FilesPanel({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const { user, isClient } = useAuth();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(isClient ? 'ATTACHMENT' : 'PREVIEW');
  const [internal, setInternal] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const files = useQuery({ queryKey: ['files', project.id], queryFn: () => api.get<FileItem[]>(`/projects/${project.id}/files`) });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', project.id] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  async function upload(list: FileList) {
    setProgress(0);
    try {
      await api.upload(`/projects/${project.id}/files`, Array.from(list), { category, visibility: internal ? 'INTERNAL' : 'CLIENT' }, setProgress);
      qc.invalidateQueries({ queryKey: ['files', project.id] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }

  const categories = FILE_CATEGORIES.filter((c) => !isClient || c !== 'PREVIEW');
  const previews = files.data?.filter((f) => f.category === 'PREVIEW') ?? [];
  const others = files.data?.filter((f) => f.category !== 'PREVIEW') ?? [];
  const canUpload = isClient ? project.access.isOwner : project.access.canWork;

  return (
    <div className="space-y-6">
      {canUpload && (
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <UploadCloud className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('files.upload')}</p>
                <p className="text-xs text-muted">{t('files.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-44">
                <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('files.category')}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{t(`files.categories.${c}`)}</option>
                  ))}
                </Select>
              </div>
              {!isClient && category !== 'PREVIEW' && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <Switch checked={internal} onCheckedChange={setInternal} /> {t('files.internalOnly')}
                </label>
              )}
              <Button onClick={() => input.current?.click()} loading={progress !== null} leftIcon={<UploadCloud className="size-4" />}>
                {t('common.upload')}
              </Button>
              <input ref={input} type="file" multiple className="hidden" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
            </div>
          </div>
          {progress !== null && <Progress value={progress} className="mt-4" />}
        </Card>
      )}

      {previews.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Eye className="size-4 text-brand" />{t('files.previews')}</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {previews.map((f) => <FileCard key={f.id} f={f} canDelete={f.uploader.id === user?.id || project.access.canManage} onDelete={() => remove.mutate(f.id)} />)}
          </div>
        </div>
      )}

      <Card className={cn(!others.length && 'overflow-hidden')}>
        <CardHeader title={t('files.title')} description={`${others.length}`} icon={<FolderOpen className="size-4" />} />
        {others.length ? (
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
            {others.map((f) => <FileCard key={f.id} f={f} canDelete={f.uploader.id === user?.id || project.access.canManage} onDelete={() => remove.mutate(f.id)} />)}
          </div>
        ) : (
          <EmptyState icon={<FolderOpen className="size-6" />} title={t('files.empty')} description={t('files.emptyBody')} />
        )}
      </Card>
    </div>
  );
}
