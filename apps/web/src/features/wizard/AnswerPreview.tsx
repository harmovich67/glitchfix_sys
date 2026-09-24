import { MULTI_VALUE_TYPES, formatAnswer, isEmptyValue, type AnswerValue, type WorkflowQuestion } from '@welco/shared';
import { fileUrl } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { FileItem } from '../../lib/types';

/** Read-only rendering of one answer (used by the review step and the requirements dossier). */
export function AnswerPreview({ q, value, files }: { q: WorkflowQuestion; value: AnswerValue; files: FileItem[] }) {
  const { t, locale } = useI18n();
  if (isEmptyValue(value)) return <span className="text-sm text-muted italic">{t('wizard.notFilled')}</span>;
  if (q.type === 'color')
    return (
      <div className="flex gap-1.5">
        {(value as string[]).map((c) => (
          <span key={c} className="size-6 rounded-md ring-1 ring-black/10" style={{ background: c }} title={c} />
        ))}
      </div>
    );
  if (q.type === 'file') {
    const byId = new Map(files.map((f) => [f.id, f]));
    return (
      <div className="flex flex-wrap gap-1.5">
        {(value as string[]).map((id) => (
          <a key={id} href={fileUrl(id)} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-fg-2 ring-1 ring-border hover:text-brand">
            {byId.get(id)?.originalName ?? 'file'}
          </a>
        ))}
      </div>
    );
  }
  if (q.type === 'url_list' || q.type === 'url')
    return (
      <div className="flex flex-col gap-0.5">
        {(Array.isArray(value) ? value : [value as string]).map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer noopener" dir="ltr" className="truncate text-sm text-brand hover:underline">
            {u.replace(/^https?:\/\//, '')}
          </a>
        ))}
      </div>
    );
  if (q.type === 'country') return <span className="text-sm text-fg">{new Intl.DisplayNames([locale], { type: 'region' }).of(value as string)}</span>;
  const labels = formatAnswer(q, value, locale);
  if (labels.length > 1 || MULTI_VALUE_TYPES.includes(q.type))
    return (
      <div className="flex flex-wrap gap-1.5">
        {labels.map((l) => (
          <span key={l} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
            {l}
          </span>
        ))}
      </div>
    );
  return <p className="text-sm whitespace-pre-line text-fg">{labels[0]}</p>;
}
