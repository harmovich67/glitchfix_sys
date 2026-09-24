import { useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, GitBranch, Info, Layers, Plus, Save, Trash2, Undo2, X } from 'lucide-react';
import { OPTION_TYPES, QUESTION_TYPES, type QuestionType, type WorkflowQuestion, type WorkflowStep } from '@welco/shared';
import { ApiError, api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { WorkflowFull } from '../../lib/types';
import { cn } from '../../lib/utils';
import { DynamicIcon, ICON_NAMES } from '../../lib/icons';
import { Button } from '../../components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '../../components/ui/form';
import { Badge, Card } from '../../components/ui/surfaces';
import { EmptyState, PageLoader } from '../../components/ui/feedback';
import { Drawer, Menu, Modal } from '../../components/ui/overlay';
import { ConditionEditor, DragRow, QuestionEditor, Simulator, uniqueKey } from './builder-parts';

type Step = WorkflowStep & { id: string };
let tmp = 0;
const tmpId = () => `tmp_${Date.now().toString(36)}_${tmp++}`;

function normalize(wf: WorkflowFull): Step[] {
  return wf.steps.map((s) => ({ ...s, id: s.id ?? tmpId(), questions: s.questions.map((q) => ({ ...q, id: q.id ?? tmpId() })) }));
}

const QTYPE_ICON: Record<QuestionType, string> = {
  text: 'Tags', textarea: 'Newspaper', url: 'Share2', select: 'ListChecks', country: 'Map', single_choice: 'BadgeCheck',
  multi_choice: 'LayoutGrid', visual_choice: 'Images', feature_checklist: 'ListChecks', color: 'Palette', file: 'Paperclip', url_list: 'Plug',
};

export default function WorkflowBuilderPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const wfQ = useQuery({ queryKey: ['workflow', id], queryFn: () => api.get<WorkflowFull>(`/workflows/${id}`) });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [baseline, setBaseline] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);

  const load = (wf: WorkflowFull) => {
    const s = normalize(wf);
    setName(wf.name);
    setDescription(wf.description ?? '');
    setSteps(s);
    setBaseline(JSON.stringify({ n: wf.name, d: wf.description ?? '', s }));
    setSelected((cur) => (cur && s.some((x) => x.id === cur) ? cur : s[0]?.id ?? null));
  };
  useEffect(() => {
    if (wfQ.data) load(wfQ.data);
  }, [wfQ.data]);

  const dirty = baseline !== '' && JSON.stringify({ n: name, d: description, s: steps }) !== baseline;
  const blocker = useBlocker(dirty);

  const save = useMutation({
    mutationFn: () =>
      api.put<WorkflowFull>(`/workflows/${id}`, {
        name,
        description: description || null,
        steps: steps.map((s, si) => ({ ...s, order: si, questions: s.questions.map((q, qi) => ({ ...q, order: qi })) })),
      }),
    onSuccess: (wf) => {
      qc.setQueryData(['workflow', id], wf);
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(t('workflows.savedOk', { n: wf.version }));
    },
    onError: (e) => {
      const details = e instanceof ApiError ? (e.details as { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | undefined) : undefined;
      const first = details?.formErrors?.[0] ?? Object.values(details?.fieldErrors ?? {})[0]?.[0];
      toast.error(first ?? errorMessage(e));
    },
  });

  const allQuestions = useMemo(
    () => steps.flatMap((s) => s.questions.map((q) => ({ ...q, stepKey: s.key, stepTitle: s.title }))),
    [steps],
  );
  const takenKeys = () => new Set(allQuestions.map((q) => q.key));
  const step = steps.find((s) => s.id === selected);
  const question = step?.questions.find((q) => q.id === editingQ);

  const updateStep = (sid: string, patch: Partial<Step>) => setSteps((all) => all.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  const updateQuestion = (qid: string, next: WorkflowQuestion) =>
    setSteps((all) => all.map((s) => ({ ...s, questions: s.questions.map((q) => (q.id === qid ? { ...next, id: qid } : q)) })));

  const addStep = () => {
    const key = uniqueKey(`step_${steps.length + 1}`, new Set(steps.map((s) => s.key)));
    const s: Step = { id: tmpId(), key, title: 'New step', description: '', icon: 'Sparkles', order: steps.length, enabled: true, conditions: null, i18n: null, questions: [] };
    setSteps((all) => [...all, s]);
    setSelected(s.id);
  };
  const addQuestion = (type: QuestionType) => {
    if (!step) return;
    const q = {
      id: tmpId(),
      key: uniqueKey(`${step.key}_${type}`, takenKeys()),
      type,
      label: t(`workflows.qtypes.${type}`),
      required: false,
      enabled: true,
      order: step.questions.length,
      options: OPTION_TYPES.includes(type) ? [{ value: 'option_1', label: 'Option 1' }, { value: 'option_2', label: 'Option 2' }] : null,
      conditions: null,
      validation: type === 'visual_choice' ? { max: 1 } : null,
    };
    updateStep(step.id, { questions: [...step.questions, q] });
    setEditingQ(q.id);
  };

  if (wfQ.isLoading || !wfQ.data) return <PageLoader />;

  return (
    <div className="-mt-2">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <Button asChild variant="ghost" size="icon-sm">
          <Link to="/app/workflows" aria-label={t('common.back')}><ArrowLeft className="rtl-flip size-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-xl rounded-lg bg-transparent px-1 text-2xl font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 px-1 text-xs text-muted">
            <span>{t('workflows.version', { n: wfQ.data.version })}</span>
            {wfQ.data.isDefault && <Badge className="bg-brand-soft text-brand ring-brand/20">{t('workflows.default')}</Badge>}
            <span>·</span>
            <span>{steps.length} {t('workflows.steps').toLowerCase()} · {allQuestions.length} {t('workflows.questions').toLowerCase()}</span>
          </div>
        </div>
        <AnimatePresence>
          {dirty && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <Badge className="bg-warning-soft text-warning ring-warning/20">{t('workflows.unsaved')}</Badge>
              <Button variant="ghost" size="sm" leftIcon={<Undo2 className="size-4" />} onClick={() => load(wfQ.data!)}>
                {t('workflows.discard')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="size-4" />}>
          {t('workflows.saveChanges')}
        </Button>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-info-soft/60 px-4 py-3 text-[13px] text-fg-2 ring-1 ring-info/15">
        <Info className="mt-0.5 size-4 shrink-0 text-info" /> {t('workflows.noteSnapshot')}
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr_300px]">
        {/* Journey map */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-fg-2">{t('workflows.flow')}</h2>
            <Button size="xs" variant="soft" leftIcon={<Plus className="size-3.5" />} onClick={addStep}>{t('workflows.addStep')}</Button>
          </div>
          <Reorder.Group axis="y" values={steps.map((s) => s.id)} onReorder={(ids) => setSteps(ids.map((i) => steps.find((s) => s.id === i)!))} className="space-y-2">
            {steps.map((s, i) => (
              <DragRow key={s.id} value={s.id} className="list-none">
                {(handle) => (
                  <div
                    onClick={() => setSelected(s.id)}
                    className={cn(
                      'relative flex cursor-pointer items-center gap-2.5 rounded-xl bg-surface p-2.5 ring-1 transition',
                      selected === s.id ? 'ring-2 ring-brand shadow-md' : 'ring-border hover:ring-border-strong',
                      !s.enabled && 'opacity-55',
                    )}
                  >
                    {handle}
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', selected === s.id ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>
                      <DynamicIcon name={s.icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{s.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                        <span>{i + 1}</span>·<span>{s.questions.length} q</span>
                        {s.conditions?.rules.length ? <span className="inline-flex items-center gap-0.5 text-brand"><GitBranch className="size-3" />{t('workflows.conditional')}</span> : null}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={s.enabled} onCheckedChange={(c) => updateStep(s.id, { enabled: c })} />
                    </div>
                  </div>
                )}
              </DragRow>
            ))}
          </Reorder.Group>
        </div>

        {/* Step editor */}
        <div className="min-w-0 space-y-6">
          {!step ? (
            <Card><EmptyState icon={<Layers className="size-6" />} title={t('workflows.selectStep')} /></Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('workflows.stepSettings')}</h3>
                  <Button size="xs" variant="ghost" className="text-danger" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDeleteStep(true)}>
                    {t('common.delete')}
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                  <Field label={t('workflows.fieldTitle')}><Input value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} /></Field>
                  <Field label={t('workflows.icon')}>
                    <Select value={step.icon ?? ''} onChange={(e) => updateStep(step.id, { icon: e.target.value })}>
                      {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('workflows.description')} className="sm:col-span-2">
                    <Textarea value={step.description ?? ''} onChange={(e) => updateStep(step.id, { description: e.target.value })} className="min-h-16" />
                  </Field>
                  <Field label={t('workflows.key')}>
                    <Input value={step.key} dir="ltr" className="font-mono text-xs" onChange={(e) => updateStep(step.id, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
                  </Field>
                </div>
                <div className="mt-5 grid gap-3 rounded-2xl bg-surface-2/50 p-4 ring-1 ring-border" dir="rtl">
                  <p className="text-[13px] font-semibold" dir="auto">{t('workflows.translations')}</p>
                  <Input value={step.i18n?.ar?.title ?? ''} placeholder="عنوان الخطوة" onChange={(e) => updateStep(step.id, { i18n: { ...step.i18n, ar: { ...step.i18n?.ar, title: e.target.value } } })} />
                  <Input value={step.i18n?.ar?.description ?? ''} placeholder="الوصف" onChange={(e) => updateStep(step.id, { i18n: { ...step.i18n, ar: { ...step.i18n?.ar, description: e.target.value } } })} />
                </div>
                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold"><GitBranch className="size-4 text-brand" />{t('workflows.conditions')}</p>
                  <ConditionEditor value={step.conditions} onChange={(conditions) => updateStep(step.id, { conditions })} questions={allQuestions.filter((q) => q.stepKey !== step.key)} />
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('workflows.questions')} · {step.questions.length}</h3>
                  <Menu.Root>
                    <Menu.Trigger asChild>
                      <Button size="sm" leftIcon={<Plus className="size-4" />}>{t('workflows.addQuestion')}</Button>
                    </Menu.Trigger>
                    <Menu.Content className="max-h-80 overflow-y-auto">
                      {QUESTION_TYPES.map((qt) => (
                        <Menu.Item key={qt} icon={<DynamicIcon name={QTYPE_ICON[qt]} />} onSelect={() => addQuestion(qt)}>
                          {t(`workflows.qtypes.${qt}`)}
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu.Root>
                </div>
                {step.questions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">{t('workflows.emptyStep')}</p>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={step.questions.map((q) => q.id!)}
                    onReorder={(ids) => updateStep(step.id, { questions: ids.map((i) => step.questions.find((q) => q.id === i)!) })}
                    className="space-y-2"
                  >
                    {step.questions.map((q) => (
                      <DragRow key={q.id} value={q.id!} className="list-none">
                        {(handle) => (
                          <div
                            onClick={() => setEditingQ(q.id!)}
                            className={cn('flex cursor-pointer items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-border transition hover:ring-border-strong', !q.enabled && 'opacity-55')}
                          >
                            {handle}
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                              <DynamicIcon name={QTYPE_ICON[q.type]} className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium">{q.label}</p>
                              <p className="truncate font-mono text-[11px] text-muted">{q.key} · {t(`workflows.qtypes.${q.type}`)}{q.options?.length ? ` · ${q.options.length}` : ''}</p>
                            </div>
                            {q.required && <Badge>{t('common.required')}</Badge>}
                            {q.conditions?.rules.length ? <Badge className="bg-brand-soft text-brand ring-brand/20"><GitBranch className="size-3" /></Badge> : null}
                            <ChevronRight className="rtl-flip size-4 text-muted" />
                          </div>
                        )}
                      </DragRow>
                    ))}
                  </Reorder.Group>
                )}
              </Card>
            </>
          )}
        </div>

        {/* Simulator */}
        <div className="space-y-6">
          <Simulator steps={steps} />
          <Card className="p-5">
            <Field label={t('workflows.description')}>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
            </Field>
          </Card>
        </div>
      </div>

      <Drawer open={!!question} onOpenChange={(o) => !o && setEditingQ(null)} title={t('workflows.questionSettings')} width="max-w-2xl">
        {question && (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-xs text-muted">{step?.title}</p>
                <p className="text-base font-semibold">{t('workflows.questionSettings')}</p>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditingQ(null)} aria-label={t('common.close')}><X className="size-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <QuestionEditor
                q={question}
                onChange={(next) => updateQuestion(question.id!, next)}
                allQuestions={allQuestions}
                onDelete={() => {
                  if (step) updateStep(step.id, { questions: step.questions.filter((q) => q.id !== question.id) });
                  setEditingQ(null);
                }}
              />
            </div>
          </>
        )}
      </Drawer>

      <Modal
        open={confirmDeleteStep}
        onOpenChange={setConfirmDeleteStep}
        title={`${t('common.delete')}: ${step?.title ?? ''}`}
        description={t('common.confirm')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteStep(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                const rest = steps.filter((s) => s.id !== selected);
                setSteps(rest);
                setSelected(rest[0]?.id ?? null);
                setConfirmDeleteStep(false);
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      />

      <Modal
        open={blocker.state === 'blocked'}
        onOpenChange={(o) => !o && blocker.reset?.()}
        title={t('workflows.unsaved')}
        description={t('common.confirm')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>{t('workflows.discard')}</Button>
          </>
        }
      />
    </div>
  );
}
