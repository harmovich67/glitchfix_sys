import { useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GitBranch, GripVertical, Plus, Trash2, X } from 'lucide-react';
import {
  CONDITION_OPS, OPTION_TYPES, QUESTION_TYPES, evaluateCondition, visibleQuestions,
  type AnswerMap, type Condition, type ConditionOp, type QuestionOption, type QuestionType, type WorkflowQuestion, type WorkflowStep,
} from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import { DynamicIcon, ICON_NAMES } from '../../lib/icons';
import { Button } from '../../components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '../../components/ui/form';
import { Badge, Card } from '../../components/ui/surfaces';
import { PREVIEW_KEYS } from '../wizard/previews';

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'q_$1')
    .slice(0, 40) || 'item';

export function uniqueKey(base: string, taken: Set<string>) {
  let k = slug(base);
  if (!/^[a-z]/.test(k)) k = `q_${k}`;
  if (k.length < 2) k = `${k}_1`;
  let i = 2;
  const root = k;
  while (taken.has(k)) k = `${root}_${i++}`;
  return k;
}

type AllQ = WorkflowQuestion & { stepKey: string; stepTitle: string };

// ── Conditions ──────────────────────────────────────────────────────────────
export function ConditionEditor({ value, onChange, questions, selfKey }: { value: Condition | null | undefined; onChange: (c: Condition | null) => void; questions: AllQ[]; selfKey?: string }) {
  const { t } = useI18n();
  const candidates = questions.filter((q) => q.key !== selfKey);
  const cond = value ?? null;
  const rules = cond?.rules ?? [];

  const setRule = (i: number, patch: Partial<Condition['rules'][number]>) =>
    onChange({ match: cond?.match ?? 'all', rules: rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Eye className="size-4" /> {t('workflows.always')}
        </p>
      ) : (
        <>
          {rules.length > 1 && (
            <Select value={cond!.match} onChange={(e) => onChange({ ...cond!, match: e.target.value as 'all' | 'any' })} className="h-8 w-48 text-xs">
              <option value="all">{t('workflows.matchAll')}</option>
              <option value="any">{t('workflows.matchAny')}</option>
            </Select>
          )}
          {rules.map((r, i) => {
            const target = candidates.find((q) => q.key === r.question);
            const needsValue = r.op !== 'filled' && r.op !== 'empty';
            const multi = r.op === 'in' || r.op === 'nin' || r.op === 'includes' || r.op === 'excludes';
            const selected = Array.isArray(r.value) ? r.value : r.value ? [r.value] : [];
            return (
              <div key={i} className="space-y-2 rounded-xl bg-surface-2/70 p-3 ring-1 ring-border">
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <Select value={r.question} onChange={(e) => setRule(i, { question: e.target.value, value: undefined })} className="h-9 text-[13px]">
                    {candidates.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.stepTitle} › {q.label}
                      </option>
                    ))}
                  </Select>
                  <Select value={r.op} onChange={(e) => setRule(i, { op: e.target.value as ConditionOp })} className="h-9 text-[13px]">
                    {CONDITION_OPS.map((op) => (
                      <option key={op} value={op}>{t(`workflows.ops.${op}`)}</option>
                    ))}
                  </Select>
                  <Button size="icon-sm" variant="ghost" className="h-9" onClick={() => {
                    const next = rules.filter((_, j) => j !== i);
                    onChange(next.length ? { match: cond!.match, rules: next } : null);
                  }} aria-label={t('common.remove')}>
                    <X className="size-4" />
                  </Button>
                </div>
                {needsValue &&
                  (target?.options?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {target.options.map((o) => {
                        const on = selected.includes(o.value);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                              if (!multi) return setRule(i, { value: o.value });
                              setRule(i, { value: on ? selected.filter((v) => v !== o.value) : [...selected, o.value] });
                            }}
                            className={cn('rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition', on ? 'bg-brand text-white ring-brand' : 'bg-surface text-fg-2 ring-border hover:ring-border-strong')}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Input value={selected.join(', ')} onChange={(e) => setRule(i, { value: multi ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : e.target.value })} className="h-9 text-[13px]" placeholder={t('workflows.value')} />
                  ))}
              </div>
            );
          })}
        </>
      )}
      <Button
        size="xs"
        variant="soft"
        leftIcon={<GitBranch className="size-3.5" />}
        disabled={!candidates.length}
        onClick={() => {
          const first = candidates.find((q) => q.key === 'project_type') ?? candidates[0];
          onChange({ match: cond?.match ?? 'all', rules: [...rules, { question: first.key, op: first.options?.length ? 'in' : 'filled', value: undefined }] });
        }}
      >
        {t('workflows.addRule')}
      </Button>
    </div>
  );
}

// ── Options ─────────────────────────────────────────────────────────────────
export function OptionsEditor({ options, onChange, withPreview }: { options: QuestionOption[]; onChange: (o: QuestionOption[]) => void; withPreview: boolean }) {
  const { t } = useI18n();
  const set = (i: number, patch: Partial<QuestionOption>) => onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const move = (i: number, d: number) => {
    const next = [...options];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={i} className="rounded-xl bg-surface-2/60 p-3 ring-1 ring-border">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={o.label} placeholder={t('workflows.label')} onChange={(e) => set(i, { label: e.target.value })} className="h-9 text-[13px]" />
            <Input
              value={o.i18n?.ar?.label ?? ''}
              dir="rtl"
              placeholder="التسمية بالعربية"
              onChange={(e) => set(i, { i18n: { ...o.i18n, ar: { ...o.i18n?.ar, label: e.target.value } } })}
              className="h-9 text-[13px]"
            />
            <Input value={o.value} placeholder={t('workflows.value')} onChange={(e) => set(i, { value: slug(e.target.value) })} className="h-9 font-mono text-xs" dir="ltr" />
            <Input value={o.description ?? ''} placeholder={t('workflows.description')} onChange={(e) => set(i, { description: e.target.value || undefined })} className="h-9 text-[13px]" />
            <Select value={o.icon ?? ''} onChange={(e) => set(i, { icon: e.target.value || undefined })} className="h-9 text-[13px]">
              <option value="">{t('workflows.icon')}: —</option>
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            {withPreview && (
              <Select value={o.preview ?? ''} onChange={(e) => set(i, { preview: e.target.value || undefined })} className="h-9 text-[13px]">
                <option value="">{t('workflows.preview')}: —</option>
                {PREVIEW_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs text-muted">
              {o.icon && <DynamicIcon name={o.icon} className="size-4" />}
              <span className="font-mono">{o.value}</span>
            </span>
            <div className="flex gap-0.5">
              <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Up"><ArrowUp className="size-3.5" /></Button>
              <Button size="icon-sm" variant="ghost" disabled={i === options.length - 1} onClick={() => move(i, 1)} aria-label="Down"><ArrowDown className="size-3.5" /></Button>
              <Button size="icon-sm" variant="ghost" onClick={() => onChange(options.filter((_, j) => j !== i))} aria-label={t('common.remove')} className="hover:text-danger"><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<Plus className="size-4" />}
        onClick={() => {
          const taken = new Set(options.map((o) => o.value));
          onChange([...options, { value: uniqueKey(`option_${options.length + 1}`, taken), label: `Option ${options.length + 1}` }]);
        }}
      >
        {t('workflows.addOption')}
      </Button>
    </div>
  );
}

// ── Question editor (drawer body) ───────────────────────────────────────────
export function QuestionEditor({ q, onChange, allQuestions, onDelete }: { q: WorkflowQuestion; onChange: (q: WorkflowQuestion) => void; allQuestions: AllQ[]; onDelete: () => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<WorkflowQuestion>) => onChange({ ...q, ...patch });
  const setAr = (field: string, v: string) => set({ i18n: { ...q.i18n, ar: { ...q.i18n?.ar, [field]: v } } });
  const hasOptions = OPTION_TYPES.includes(q.type);
  const v = q.validation ?? {};
  const setV = (patch: Record<string, unknown>) => {
    const next = { ...v, ...patch };
    Object.keys(next).forEach((k) => (next as Record<string, unknown>)[k] === undefined && delete (next as Record<string, unknown>)[k]);
    set({ validation: Object.keys(next).length ? next : null });
  };
  const num = (s: string) => (s === '' ? undefined : Math.max(0, Number(s)));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('workflows.label')} className="sm:col-span-2">
          <Input value={q.label} onChange={(e) => set({ label: e.target.value })} />
        </Field>
        <Field label={t('workflows.type')}>
          <Select value={q.type} onChange={(e) => set({ type: e.target.value as QuestionType, options: OPTION_TYPES.includes(e.target.value as QuestionType) ? q.options ?? [] : null })}>
            {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`workflows.qtypes.${qt}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('workflows.key')}>
          <Input value={q.key} dir="ltr" className="font-mono text-xs" onChange={(e) => set({ key: slug(e.target.value) })} />
        </Field>
        <Field label={t('workflows.placeholder')}>
          <Input value={q.placeholder ?? ''} onChange={(e) => set({ placeholder: e.target.value || null })} />
        </Field>
        <Field label={t('workflows.helpText')}>
          <Input value={q.helpText ?? ''} onChange={(e) => set({ helpText: e.target.value || null })} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2.5 text-sm"><Switch checked={q.required} onCheckedChange={(c) => set({ required: c })} />{t('common.required')}</label>
        <label className="flex items-center gap-2.5 text-sm"><Switch checked={q.enabled} onCheckedChange={(c) => set({ enabled: c })} />{t('common.enabled')}</label>
      </div>

      {hasOptions && (
        <section>
          <h4 className="mb-2 text-[13px] font-semibold">{t('workflows.options')}</h4>
          <OptionsEditor options={q.options ?? []} onChange={(options) => set({ options })} withPreview={q.type === 'visual_choice'} />
        </section>
      )}

      <section>
        <h4 className="mb-2 text-[13px] font-semibold">{t('workflows.validation')}</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('workflows.min')}><Input type="number" min={0} value={v.min ?? ''} onChange={(e) => setV({ min: num(e.target.value) })} /></Field>
          <Field label={t('workflows.max')}><Input type="number" min={0} value={v.max ?? ''} onChange={(e) => setV({ max: num(e.target.value) })} /></Field>
          {q.type === 'file' && (
            <>
              <Field label={t('workflows.maxFiles')}><Input type="number" min={1} value={v.maxFiles ?? ''} onChange={(e) => setV({ maxFiles: num(e.target.value) })} /></Field>
              <Field label="Accept">
                <Select value={v.accept ?? 'any'} onChange={(e) => setV({ accept: e.target.value })}>
                  <option value="any">Any</option>
                  <option value="image">Images</option>
                  <option value="document">Documents</option>
                </Select>
              </Field>
            </>
          )}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[13px] font-semibold">{t('workflows.conditions')}</h4>
        <ConditionEditor value={q.conditions} onChange={(conditions) => set({ conditions })} questions={allQuestions} selfKey={q.key} />
      </section>

      <Field label={t('workflows.aiHint')} hint="Used by the AI assistant to guide and improve answers.">
        <Textarea value={q.aiHint ?? ''} onChange={(e) => set({ aiHint: e.target.value || null })} className="min-h-20" />
      </Field>

      <section className="rounded-2xl bg-surface-2/50 p-4 ring-1 ring-border">
        <h4 className="mb-3 text-[13px] font-semibold">{t('workflows.translations')}</h4>
        <div className="grid gap-3" dir="rtl">
          <Input value={q.i18n?.ar?.label ?? ''} placeholder="السؤال" onChange={(e) => setAr('label', e.target.value)} />
          <Input value={q.i18n?.ar?.placeholder ?? ''} placeholder="النص التوضيحي" onChange={(e) => setAr('placeholder', e.target.value)} />
          <Input value={q.i18n?.ar?.helpText ?? ''} placeholder="نص المساعدة" onChange={(e) => setAr('helpText', e.target.value)} />
        </div>
      </section>

      <Button variant="ghost" className="text-danger" leftIcon={<Trash2 className="size-4" />} onClick={onDelete}>
        {t('common.delete')}
      </Button>
    </div>
  );
}

// ── Reorderable row with a drag handle ──────────────────────────────────────
export function DragRow<T>({ value, children, className }: { value: T; children: (handle: React.ReactNode) => React.ReactNode; className?: string }) {
  const controls = useDragControls();
  const handle = (
    <span
      onPointerDown={(e) => controls.start(e)}
      className="cursor-grab touch-none rounded p-0.5 text-muted/60 hover:text-fg active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <GripVertical className="size-4" />
    </span>
  );
  return (
    <Reorder.Item value={value} dragListener={false} dragControls={controls} className={className} whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
      {children(handle)}
    </Reorder.Item>
  );
}

// ── Simulator ───────────────────────────────────────────────────────────────
export function Simulator({ steps }: { steps: WorkflowStep[] }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<AnswerMap>({});
  // Questions that drive branching (referenced by any condition) and have options.
  const drivers = useMemo(() => {
    const refs = new Set<string>();
    steps.forEach((s) => {
      s.conditions?.rules.forEach((r) => refs.add(r.question));
      s.questions.forEach((q) => q.conditions?.rules.forEach((r) => refs.add(r.question)));
    });
    return steps.flatMap((s) => s.questions).filter((q) => refs.has(q.key) && q.options?.length);
  }, [steps]);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">{t('workflows.simulator')}</h3>
      <p className="mt-1 text-xs text-muted">{t('workflows.simulatorHint')}</p>
      <div className="mt-4 space-y-3">
        {drivers.map((q) => (
          <Field key={q.key} label={q.label}>
            <Select value={(answers[q.key] as string) ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value || null }))} className="h-9 text-[13px]">
              <option value="">—</option>
              {q.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        ))}
      </div>
      <ol className="mt-5 space-y-1.5">
        {steps.map((s, i) => {
          const visible = s.enabled && evaluateCondition(s.conditions, answers);
          const qCount = visible ? visibleQuestions(s, answers).length : 0;
          return (
            <li key={s.key} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]', visible && qCount ? 'bg-success-soft/50 text-fg' : 'text-muted line-through decoration-muted/40')}>
              <span className="w-4 text-end font-mono text-[11px] text-muted">{i + 1}</span>
              {visible && qCount ? <Eye className="size-3.5 text-success" /> : <EyeOff className="size-3.5" />}
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              {visible && qCount > 0 && <Badge>{qCount}</Badge>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
