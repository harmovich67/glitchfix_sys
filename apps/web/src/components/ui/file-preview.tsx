import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { fileUrl } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { formatBytes } from '../../lib/utils';
import { Button } from './button';
import { Spinner } from './feedback';
import { Modal } from './overlay';

export interface PreviewableFile {
  id: string;
  originalName: string;
  mimeType: string;
  size?: number;
}

type Kind = 'image' | 'pdf' | 'text' | 'none';

const TEXT_LIMIT = 200_000;

export function previewKind(mimeType: string): Kind {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(mimeType)) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return 'text';
  return 'none';
}

function TextBody({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ['file-text', id],
    queryFn: async () => {
      const res = await fetch(fileUrl(id), { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    staleTime: 5 * 60_000,
  });
  if (q.isLoading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;
  if (q.isError) return <p className="py-10 text-center text-sm text-danger">{t('files.previewFailed')}</p>;
  const text = q.data ?? '';
  return (
    <pre dir="auto" className="max-h-[65vh] overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg">
      {text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT)}\n…` : text}
    </pre>
  );
}

/** Popup viewer for an uploaded file: inline preview when the type allows it, always with a download button. */
export function FilePreviewModal({ file, open, onOpenChange }: { file: PreviewableFile; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const kind = previewKind(file.mimeType);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={<span className="block max-w-full truncate" dir="auto" title={file.originalName}>{file.originalName}</span>}
      description={file.size != null ? formatBytes(file.size) : undefined}
      footer={
        <Button asChild variant="primary" size="sm">
          <a href={fileUrl(file.id)} download={file.originalName}>
            <Download className="size-4" />
            {t('common.download')}
          </a>
        </Button>
      }
    >
      {kind === 'image' && (
        <div className="flex max-h-[65vh] justify-center overflow-auto rounded-xl bg-surface-2 p-2">
          <img src={fileUrl(file.id, true)} alt={file.originalName} className="max-h-[62vh] max-w-full object-contain" />
        </div>
      )}
      {kind === 'pdf' && <iframe src={fileUrl(file.id, true)} title={file.originalName} className="h-[65vh] w-full rounded-xl bg-surface-2 ring-1 ring-border" />}
      {kind === 'text' && <TextBody id={file.id} />}
      {kind === 'none' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted">
          <FileText className="size-10" />
          <p className="text-sm">{t('files.noPreview')}</p>
        </div>
      )}
    </Modal>
  );
}

/** Wraps any trigger element: clicking it opens the file in the preview popup. */
export function FilePreviewTrigger({ file, children, className, title }: { file: PreviewableFile; children: ReactNode; className?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title={title}>
        {children}
      </button>
      <FilePreviewModal file={file} open={open} onOpenChange={setOpen} />
    </>
  );
}
