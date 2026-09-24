import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, FileText, Image as ImageIcon, Link2, Loader2, Plus, Sparkles, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { tr, type AnswerValue, type QuestionOption, type WorkflowQuestion } from '@welco/shared';
import { api, errorMessage, fileUrl } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { FileItem } from '../../lib/types';
import { cn, countryName, flag, formatBytes } from '../../lib/utils';
import { DynamicIcon } from '../../lib/icons';
import { TYPE_GRADIENT } from '../../lib/meta';
import { Button } from '../../components/ui/button';
import { FilePreviewTrigger } from '../../components/ui/file-preview';
import { Input, Select, Textarea } from '../../components/ui/form';
import { OptionPreview } from './previews';
import { COUNTRY_CODES, PRIORITY_COUNTRIES } from './countries';

export interface QuestionFieldProps {
  question: WorkflowQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  error?: string | null;
  projectId: string;
  files: FileItem[];
  onFilesChanged: () => void;
  aiHighlight?: string[];
  onImprove?: (text: string) => Promise<string>;
  disabled?: boolean;
}

const asArray = (v: AnswerValue) => (Array.isArray(v) ? v : v ? [v] : []);

export function errorText(t: (k: string, v?: Record<string, string | number>) => string, code: string | null | undefined) {
  if (!code) return null;
  const [kind, n] = code.split(':');
  switch (kind) {
    case 'required': return t('wizard.required');
    case 'min': return t('wizard.minSel', { n });
    case 'max': return t('wizard.maxSel', { n });
    case 'minLength': return t('wizard.minChars', { n });
    case 'url': return t('wizard.invalidUrl');
    default: return code;
  }
}

function useOptionLabel() {
  const { locale } = useI18n();
  return (o: QuestionOption) => ({ label: tr(o, 'label', locale), description: o.description ? tr(o, 'description', locale) : '' });
}

// ── Option-based inputs ─────────────────────────────────────────────────────
function VisualChoice({ q, value, onChange, projectType }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void; projectType?: boolean }) {
  const label = useOptionLabel();
  const { t } = useI18n();
  const single = q.validation?.max === 1;
  const selected = asArray(value);
  const toggle = (v: string) => {
    if (single) return onChange(selected[0] === v ? null : v);
    if (selected.includes(v)) return onChange(selected.filter((x) => x !== v));
    if (q.validation?.max && selected.length >= q.validation.max) {
      toast.message(t('wizard.chooseUpTo', { n: q.validation.max }));
      return;
    }
    onChange([...selected, v]);
  };
  const hasPreview = (q.options ?? []).some((o) => o.preview || o.image);

  return (
    <div className={cn('grid gap-3', hasPreview ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
      {(q.options ?? []).map((o, i) => {
        const active = selected.includes(o.value);
        const { label: l, description } = label(o);
        return (
          <motion.button
            type="button"
            key={o.value}
            onClick={() => toggle(o.value)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={active}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-surface text-start ring-1 transition-shadow',
              active ? 'ring-2 ring-brand shadow-glow' : 'ring-border hover:ring-border-strong hover:shadow-md',
            )}
          >
            {hasPreview ? (
              <>
                <div className="overflow-hidden border-b border-border">
                  <div className="transition-transform duration-500 group-hover:scale-[1.04]">
                    <OptionPreview preview={o.preview} image={o.image} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-fg">{l}</p>
                  {description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{description}</p>}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3.5 p-4">
                <div
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-105',
                    projectType ? TYPE_GRADIENT[o.value] ?? 'from-brand to-accent' : 'from-brand to-accent',
                  )}
                >
                  <DynamicIcon name={o.icon} className="size-5" />
                </div>
                <div className="min-w-0 pe-6">
                  <p className="text-[15px] font-semibold text-fg">{l}</p>
                  {description && <p className="mt-1 text-[13px] leading-snug text-muted">{description}</p>}
                </div>
              </div>
            )}
            <AnimatePresence>
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute end-3 top-3 flex size-6 items-center justify-center rounded-full bg-brand text-white shadow-md"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

function SingleChoice({ q, value, onChange }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const label = useOptionLabel();
  return (
    <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
      {(q.options ?? []).map((o) => {
        const active = value === o.value;
        const { label: l, description } = label(o);
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            key={o.value}
            onClick={() => onChange(active ? null : o.value)}
            className={cn(
              'flex items-center gap-3 rounded-xl bg-surface px-4 py-3.5 text-start ring-1 transition-all',
              active ? 'bg-brand-soft/60 ring-2 ring-brand' : 'ring-border hover:ring-border-strong',
            )}
          >
            <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full ring-2 transition', active ? 'ring-brand' : 'ring-border-strong')}>
              <motion.span animate={{ scale: active ? 1 : 0 }} className="size-2.5 rounded-full bg-brand" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{l}</span>
              {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({ q, value, onChange, highlight }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void; highlight?: string[] }) {
  const label = useOptionLabel();
  const selected = asArray(value);
  return (
    <div className="flex flex-wrap gap-2">
      {(q.options ?? []).map((o) => {
        const active = selected.includes(o.value);
        return (
          <motion.button
            type="button"
            key={o.value}
            whileTap={{ scale: 0.95 }}
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 transition-colors',
              active ? 'bg-brand text-white ring-brand' : 'bg-surface text-fg-2 ring-border hover:ring-border-strong hover:text-fg',
              highlight?.includes(o.value) && !active && 'ring-2 ring-brand/50',
            )}
          >
            {active ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5 opacity-50" />}
            {label(o).label}
          </motion.button>
        );
      })}
    </div>
  );
}

function FeatureChecklist({ q, value, onChange, highlight }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void; highlight?: string[] }) {
  const label = useOptionLabel();
  const { t } = useI18n();
  const selected = asArray(value);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {(q.options ?? []).map((o, i) => {
        const active = selected.includes(o.value);
        const { label: l, description } = label(o);
        const suggested = highlight?.includes(o.value);
        return (
          <motion.button
            type="button"
            key={o.value}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => onChange(active ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
            aria-pressed={active}
            className={cn(
              'relative flex items-center gap-3 rounded-xl bg-surface p-3.5 text-start ring-1 transition-all',
              active ? 'bg-brand-soft/50 ring-2 ring-brand' : 'ring-border hover:ring-border-strong',
            )}
          >
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors', active ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>
              <DynamicIcon name={o.icon} className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-fg">{l}</span>
              {description && <span className="block truncate text-xs text-muted">{description}</span>}
            </span>
            <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md ring-1 transition', active ? 'bg-brand ring-brand' : 'ring-border-strong')}>
              {active && <Check className="size-3.5 text-white" strokeWidth={3} />}
            </span>
            {suggested && (
              <span className="absolute -top-2 end-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand to-accent px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                <Sparkles className="size-2.5" /> {t('wizard.aiSuggested')}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Colour palette ──────────────────────────────────────────────────────────
const PRESETS = ['#111827', '#5B5BF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#C9A45C', '#F4EDE4', '#0B2A5B'];

function ColorPalette({ q, value, onChange }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const { t } = useI18n();
  const colors = asArray(value);
  const max = q.validation?.max ?? 6;
  const add = (c: string) => {
    const hex = c.toUpperCase();
    if (colors.includes(hex) || colors.length >= max) return;
    onChange([...colors, hex]);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {colors.map((c, i) => (
            <motion.div key={c} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="group relative">
              <label className="block cursor-pointer">
                <span className="block size-16 rounded-2xl shadow-md ring-1 ring-black/10" style={{ background: c }} />
                <input
                  type="color"
                  value={c}
                  onChange={(e) => onChange(colors.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
                  className="sr-only"
                />
              </label>
              <span className="mt-1.5 block text-center font-mono text-[10px] text-muted">{c}</span>
              <button
                type="button"
                onClick={() => onChange(colors.filter((x) => x !== c))}
                className="absolute -end-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full bg-fg text-bg shadow group-hover:flex"
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {colors.length < max && (
          <label className="flex size-16 cursor-pointer flex-col items-center justify-center rounded-2xl text-muted ring-1 ring-border ring-dashed transition hover:text-brand hover:ring-brand">
            <Plus className="size-5" />
            <span className="text-[10px]">{t('wizard.addColor')}</span>
            <input type="color" className="sr-only" onChange={(e) => add(e.target.value)} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => add(c)}
            className="size-6 rounded-full ring-1 ring-black/10 transition hover:scale-110"
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

// ── Links ───────────────────────────────────────────────────────────────────
function UrlList({ q, value, onChange }: { q: WorkflowQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const { t, locale } = useI18n();
  const items = asArray(value);
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, /^https?:\/\//i.test(v) ? v : `https://${v}`]);
    setDraft('');
  };
  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {items.map((url, i) => (
          <motion.div
            key={`${url}-${i}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-2.5 ring-1 ring-border"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-surface-2 text-muted">
              <Link2 className="size-3.5" />
            </span>
            <a href={url} target="_blank" rel="noreferrer noopener" dir="ltr" className="min-w-0 flex-1 truncate text-sm text-fg hover:text-brand">
              {url.replace(/^https?:\/\//, '')}
            </a>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label="Remove">
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-2">
        <Input
          dir="ltr"
          value={draft}
          placeholder={(q.placeholder && tr(q, 'placeholder', locale)) || 'https://'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} leftIcon={<Plus className="size-4" />}>
          {t('wizard.addLink')}
        </Button>
      </div>
    </div>
  );
}

// ── Files ───────────────────────────────────────────────────────────────────
function categoryFor(key: string) {
  if (/logo|brand/.test(key)) return 'BRAND';
  if (/screenshot/.test(key)) return 'SCREENSHOT';
  if (/reference|inspiration/.test(key)) return 'REFERENCE';
  return 'ATTACHMENT';
}

function FileUpload({ q, value, onChange, projectId, files, onFilesChanged, disabled }: QuestionFieldProps & { q: WorkflowQuestion }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const ids = asArray(value);
  const max = q.validation?.maxFiles ?? 5;
  const accept = q.validation?.accept === 'image' ? 'image/*' : q.validation?.accept === 'document' ? '.pdf,.doc,.docx,.ppt,.pptx,.txt' : undefined;
  const byId = new Map(files.map((f) => [f.id, f]));

  async function upload(list: FileList | File[]) {
    const arr = Array.from(list).slice(0, Math.max(0, max - ids.length));
    if (!arr.length) return;
    setProgress(0);
    try {
      const created = await api.upload<FileItem[]>(`/projects/${projectId}/files`, arr, { category: categoryFor(q.key), questionKey: q.key }, setProgress);
      onChange([...ids, ...created.map((f) => f.id)]);
      onFilesChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  async function remove(id: string) {
    onChange(ids.filter((x) => x !== id));
    await api.del(`/files/${id}`).catch(() => {});
    onFilesChanged();
  }

  return (
    <div className="space-y-3">
      {ids.length < max && (
        <button
          type="button"
          disabled={disabled || progress !== null}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
            dragging ? 'border-brand bg-brand-soft/60' : 'border-border hover:border-brand/50 hover:bg-surface-2/60',
          )}
        >
          {progress !== null ? (
            <>
              <Loader2 className="size-7 animate-spin text-brand" />
              <p className="mt-3 text-sm font-medium">{t('wizard.uploading', { pct: progress })}</p>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <UploadCloud className="size-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-fg">{t('wizard.dropFiles')}</p>
              <p className="mt-1 text-xs text-muted">{t('wizard.fileHint', { n: max })}</p>
            </>
          )}
        </button>
      )}
      <input ref={input} type="file" multiple={max > 1} accept={accept} className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      {ids.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ids.map((id) => {
            const f = byId.get(id);
            const isImage = f?.mimeType.startsWith('image/') && f.mimeType !== 'image/svg+xml';
            return (
              <motion.div key={id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 rounded-xl bg-surface p-2.5 ring-1 ring-border">
                {f ? (
                  <FilePreviewTrigger file={f} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start">
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-muted">
                      {isImage ? <img src={fileUrl(id, true)} alt="" className="size-full object-cover" /> : f.mimeType.startsWith('image/') ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{f.originalName}</span>
                      <span className="block text-[11px] text-muted">{formatBytes(f.size)}</span>
                    </span>
                  </FilePreviewTrigger>
                ) : (
                  <div className="min-w-0 flex-1 text-[13px] text-muted">…</div>
                )}
                <button type="button" onClick={() => remove(id)} className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Text with AI improve ────────────────────────────────────────────────────
function LongText({ q, value, onChange, onImprove, disabled }: QuestionFieldProps & { q: WorkflowQuestion }) {
  const { t, locale } = useI18n();
  const [improving, setImproving] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const text = typeof value === 'string' ? value : '';
  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={text}
          disabled={disabled}
          placeholder={q.placeholder ? tr(q, 'placeholder', locale) : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-32 pb-11"
        />
        {onImprove && (
          <div className="absolute end-2.5 bottom-2.5">
            <Button
              type="button"
              size="xs"
              variant="soft"
              disabled={text.trim().length < 8 || improving}
              loading={improving}
              leftIcon={!improving ? <Sparkles className="size-3.5" /> : undefined}
              onClick={async () => {
                setImproving(true);
                try {
                  setSuggestion(await onImprove(text));
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setImproving(false);
                }
              }}
            >
              {improving ? t('wizard.improving') : t('wizard.improve')}
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl bg-gradient-to-br from-brand-soft to-surface p-4 ring-1 ring-brand/25"
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Sparkles className="size-3.5" /> {t('wizard.aiSuggested')}
            </div>
            <p className="text-sm leading-relaxed text-fg">{suggestion}</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="xs"
                onClick={() => {
                  onChange(suggestion);
                  setSuggestion(null);
                }}
              >
                {t('wizard.useSuggestion')}
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => setSuggestion(null)}>
                {t('wizard.keepMine')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountrySelect({ value, onChange, placeholder }: { value: AnswerValue; onChange: (v: AnswerValue) => void; placeholder: string }) {
  const { locale } = useI18n();
  const options = useMemo(() => {
    const all = COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale));
    const top = PRIORITY_COUNTRIES.map((c) => all.find((x) => x.code === c)!).filter(Boolean);
    return { top, all };
  }, [locale]);
  return (
    <Select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} className="h-12 text-[15px]">
      <option value="">{placeholder}</option>
      <optgroup label="—">
        {options.top.map((c) => (
          <option key={`top-${c.code}`} value={c.code}>
            {flag(c.code)} {c.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="A–Z">
        {options.all.map((c) => (
          <option key={c.code} value={c.code}>
            {flag(c.code)} {c.name}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}

export function QuestionField(props: QuestionFieldProps) {
  const { question: q, value, onChange, error, aiHighlight, disabled } = props;
  const { t, locale } = useI18n();
  const labelText = tr(q, 'label', locale);
  const help = q.helpText ? tr(q, 'helpText', locale) : '';
  const placeholder = q.placeholder ? tr(q, 'placeholder', locale) : '';

  let control: ReactNode;
  switch (q.type) {
    case 'text':
      control = <Input value={typeof value === 'string' ? value : ''} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-12 text-[15px]" />;
      break;
    case 'url':
      control = <Input dir="ltr" type="url" value={typeof value === 'string' ? value : ''} disabled={disabled} placeholder={placeholder || 'https://'} onChange={(e) => onChange(e.target.value)} className="h-12 text-[15px]" icon={<Link2 className="size-4" />} />;
      break;
    case 'textarea':
      control = <LongText {...props} q={q} />;
      break;
    case 'select':
      control = (
        <Select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} className="h-12 text-[15px]">
          <option value="">{t('wizard.select')}</option>
          {(q.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {tr(o, 'label', locale)}
            </option>
          ))}
        </Select>
      );
      break;
    case 'country':
      control = <CountrySelect value={value} onChange={onChange} placeholder={t('wizard.selectCountry')} />;
      break;
    case 'single_choice':
      control = <SingleChoice q={q} value={value} onChange={onChange} />;
      break;
    case 'multi_choice':
      control = <MultiChoice q={q} value={value} onChange={onChange} highlight={aiHighlight} />;
      break;
    case 'visual_choice':
      control = <VisualChoice q={q} value={value} onChange={onChange} projectType={q.key === 'project_type'} />;
      break;
    case 'feature_checklist':
      control = <FeatureChecklist q={q} value={value} onChange={onChange} highlight={aiHighlight} />;
      break;
    case 'color':
      control = <ColorPalette q={q} value={value} onChange={onChange} />;
      break;
    case 'url_list':
      control = <UrlList q={q} value={value} onChange={onChange} />;
      break;
    case 'file':
      control = <FileUpload {...props} q={q} />;
      break;
  }

  const count = Array.isArray(value) ? value.length : 0;
  return (
    <div id={`q-${q.key}`} className="scroll-mt-28">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <label className="text-[15px] font-semibold text-fg">
            {labelText}
            {q.required && <span className="ms-1 text-brand">*</span>}
          </label>
          {help && <p className="mt-1 text-[13px] text-muted">{help}</p>}
        </div>
        {count > 0 && ['multi_choice', 'feature_checklist', 'visual_choice'].includes(q.type) && (
          <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{t('wizard.selected', { n: count })}</span>
        )}
      </div>
      {control}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-[13px] font-medium text-danger">
            {errorText(t, error)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
