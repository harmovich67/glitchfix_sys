import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Cloud, CloudOff, Loader2, Lock, Pencil, Send, Sparkles, X,
} from 'lucide-react';
import {
  MULTI_VALUE_TYPES, formatAnswer, isEmptyValue, journeyProgress, tr, validateStep, visibleQuestions, visibleSteps,
  type AnswerMap, type AnswerValue, type ValidationIssue, type WorkflowQuestion,
} from '@welco/shared';
import { ApiError, api, errorMessage, fileUrl } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { AISuggestion, FileItem, ProjectDetail } from '../../lib/types';
import { cn, debounce } from '../../lib/utils';
import { DynamicIcon } from '../../lib/icons';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui/button';
import { EmptyState, PageLoader, Progress, ProgressRing } from '../../components/ui/feedback';
import { Drawer } from '../../components/ui/overlay';
import { LogoMark } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Preferences';
import { QuestionField } from './QuestionField';
import { AnswerPreview } from './AnswerPreview';
import { AssistantPanel, useAIStatus } from './AssistantPanel';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const REVIEW = '__review';

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useI18n();
  const map = {
    idle: { icon: <Cloud className="size-3.5" />, text: t('wizard.saved'), cls: 'text-muted' },
    saved: { icon: <Check className="size-3.5" />, text: t('wizard.saved'), cls: 'text-success' },
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: t('wizard.savingNow'), cls: 'text-muted' },
    error: { icon: <CloudOff className="size-3.5" />, text: t('wizard.saveError'), cls: 'text-danger' },
  }[state];
  return (
    <span className={cn('hidden items-center gap-1.5 text-xs font-medium sm:inline-flex', map.cls)}>
      {map.icon}
      {map.text}
    </span>
  );
}

function SuccessScreen({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-sm"
          style={{ background: ['#5b5bf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'][i % 5], left: '50%', top: '40%' }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: (Math.random() - 0.5) * 700, y: (Math.random() - 0.2) * 500, rotate: Math.random() * 540 }}
          transition={{ duration: 1.8 + Math.random(), ease: 'easeOut' }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="flex size-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-brand to-accent text-white shadow-glow"
      >
        <CheckCircle2 className="size-12" strokeWidth={1.75} />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8 text-3xl font-semibold sm:text-4xl">
        {t('wizard.successTitle')}
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-3 max-w-lg text-muted">
        {t('wizard.successBody')}
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex gap-3">
        <Button asChild size="lg" rightIcon={<ArrowRight className="rtl-flip size-4" />}>
          <Link to={`/app/projects/${project.id}`}>{t('wizard.goDashboard')}</Link>
        </Button>
      </motion.div>
      <p className="mt-6 font-mono text-xs text-muted">{project.code}</p>
    </div>
  );
}

export default function WizardPage() {
  const { id = '' } = useParams();
  const { t, locale, dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ai = useAIStatus();

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => api.get<ProjectDetail>(`/projects/${id}`) });
  const filesQ = useQuery({ queryKey: ['files', id], queryFn: () => api.get<FileItem[]>(`/projects/${id}/files`) });
  const project = projectQ.data;

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [aiHighlights, setAiHighlights] = useState<Record<string, string[]>>({});
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantDrawer, setAssistantDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const initialized = useRef(false);
  const pending = useRef<AnswerMap>({});

  useEffect(() => {
    if (project && !initialized.current) {
      initialized.current = true;
      setAnswers(project.answers);
      const steps = visibleSteps(project.workflow, project.answers);
      setCurrentKey(steps.some((s) => s.key === project.currentStepKey) ? project.currentStepKey : (steps[0]?.key ?? null));
    }
  }, [project]);

  const steps = useMemo(() => (project ? visibleSteps(project.workflow, answers) : []), [project, answers]);
  const index = currentKey === REVIEW ? steps.length : Math.max(0, steps.findIndex((s) => s.key === currentKey));
  const step = steps[index];
  const progress = project ? journeyProgress(project.workflow, answers) : 0;

  // ── Autosave ────────────────────────────────────────────────────────────────
  const flush = useCallback(
    async (extra?: { currentStepKey?: string; completedStepKey?: string }) => {
      const batch = pending.current;
      pending.current = {};
      if (!Object.keys(batch).length && !extra) return;
      setSaveState('saving');
      try {
        await api.patch(`/projects/${id}/answers`, { answers: batch, ...extra });
        setSaveState('saved');
        qc.invalidateQueries({ queryKey: ['projects'] });
      } catch (e) {
        pending.current = { ...batch, ...pending.current };
        setSaveState('error');
        if (e instanceof ApiError && e.status === 403) toast.error(e.message);
      }
    },
    [id, qc],
  );
  const debouncedFlush = useMemo(() => debounce(() => void flush(), 800), [flush]);
  useEffect(() => () => void flush(), [flush]);

  const setAnswer = (key: string, value: AnswerValue) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    pending.current[key] = value === undefined ? null : value;
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
    debouncedFlush();
  };

  const go = async (key: string, dirSign: number, completed?: string) => {
    debouncedFlush.flush();
    setDirection(dirSign);
    setCurrentKey(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await flush({ currentStepKey: key === REVIEW ? undefined : key, completedStepKey: completed });
  };

  const showIssues = (issues: ValidationIssue[]) => {
    setErrors(Object.fromEntries(issues.map((i) => [i.questionKey, i.message])));
    document.getElementById(`q-${issues[0].questionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast.error(t('wizard.missing'));
  };

  const next = () => {
    if (!step || !project) return;
    const issues = validateStep(step, answers);
    if (issues.length) return showIssues(issues);
    const nextStep = steps[index + 1];
    void go(nextStep ? nextStep.key : REVIEW, 1, step.key);
  };
  const back = () => {
    const prev = steps[index - 1];
    if (prev) void go(prev.key, -1);
  };

  const submit = async () => {
    setSubmitting(true);
    debouncedFlush.flush();
    await flush();
    try {
      const updated = await api.post<ProjectDetail>(`/projects/${id}/submit`);
      qc.setQueryData(['project', id], updated);
      qc.invalidateQueries({ queryKey: ['projects'] });
      setSubmitted(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INCOMPLETE') {
        const issues = (e.details as { issues: ValidationIssue[] }).issues;
        setDirection(-1);
        setCurrentKey(issues[0].stepKey);
        setTimeout(() => showIssues(issues), 350);
      } else toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const applySuggestion = (s: AISuggestion) => {
    if (!project) return;
    const q = project.workflow.steps.flatMap((st) => st.questions).find((x) => x.key === s.questionKey);
    if (!q) return;
    const single = q.type === 'single_choice' || q.type === 'select' || (q.type === 'visual_choice' && q.validation?.max === 1);
    const current = answers[q.key];
    const merged = single ? s.values[0] : [...new Set([...(Array.isArray(current) ? current : current ? [current] : []), ...s.values])];
    setAnswer(q.key, merged);
    setAiHighlights((h) => ({ ...h, [q.key]: s.values }));
    const target = project.workflow.steps.find((st) => st.questions.some((x) => x.key === q.key));
    if (target && target.key !== step?.key) toast.success(`${t('assistant.applied')} → ${tr(target, 'title', locale)}`);
  };

  const improve = async (questionKey: string, text: string) =>
    (await api.post<{ text: string }>('/ai/improve', { projectId: id, questionKey, text })).text;

  if (projectQ.isLoading || !project) return <PageLoader />;
  if (project.kind === 'FIX') return <Navigate to={`/app/projects/${project.id}`} replace />;

  const showAI = !!ai.data?.enabled;
  const canImprove = showAI && ai.data?.features.improve;
  const isOwner = project.access.isOwner || user?.id === project.client.id;

  if (!project.access.canEditAnswers)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <EmptyState
          icon={<Lock className="size-6" />}
          title={t('wizard.lockedTitle')}
          description={t('wizard.lockedBody')}
          action={
            <Button asChild>
              <Link to={`/app/projects/${id}?tab=conversation`}>{t('hub.conversation')}</Link>
            </Button>
          }
        />
      </div>
    );

  const slide = {
    initial: (d: number) => ({ opacity: 0, x: 40 * d * (dir === 'rtl' ? -1 : 1) }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: -40 * d * (dir === 'rtl' ? -1 : 1) }),
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link to="/app" className="shrink-0">
            <LogoMark />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{project.title}</p>
            <p className="font-mono text-[11px] text-muted">{project.code}</p>
          </div>
          <SaveIndicator state={saveState} />
          <LanguageToggle />
          <ThemeToggle />
          {showAI && (
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Sparkles className="size-4" />}
              onClick={() => (window.innerWidth >= 1280 ? setAssistantOpen((o) => !o) : setAssistantDrawer(true))}
            >
              <span className="hidden sm:inline">{t('assistant.open')}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              debouncedFlush.flush();
              await flush();
              navigate(`/app/projects/${id}`);
            }}
          >
            {t('wizard.exit')}
          </Button>
        </div>
        <Progress value={submitted ? 100 : progress} className="h-[3px] rounded-none bg-transparent" />
      </header>

      {submitted ? (
        <SuccessScreen project={project} />
      ) : (
        <div className="flex">
          {/* Step rail */}
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 flex-col border-e border-border px-5 py-8 lg:flex">
            <div className="mb-6 flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
              <ProgressRing value={progress} />
              <div>
                <p className="text-sm font-semibold text-fg">{t('wizard.progress', { n: progress })}</p>
                <p className="text-xs text-muted">{t('wizard.step', { n: Math.min(index + 1, steps.length), total: steps.length })}</p>
              </div>
            </div>
            <nav className="-mx-2 flex-1 space-y-0.5 overflow-y-auto">
              {steps.map((s, i) => {
                const current = i === index && currentKey !== REVIEW;
                const answered = visibleQuestions(s, answers).some((q) => !isEmptyValue(answers[q.key]));
                const done = !current && answered && validateStep(s, answers).length === 0;
                return (
                  <motion.button
                    layout
                    key={s.key}
                    onClick={() => void go(s.key, i > index ? 1 : -1)}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors', current ? 'bg-surface shadow-sm ring-1 ring-border' : 'hover:bg-surface-2')}
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        done ? 'bg-success-soft text-success' : current ? 'bg-brand text-white shadow-md' : 'bg-surface-2 text-muted',
                      )}
                    >
                      {done ? <Check className="size-4" strokeWidth={2.5} /> : <DynamicIcon name={s.icon} className="size-4" />}
                    </span>
                    <span className={cn('truncate text-[13px]', current ? 'font-semibold text-fg' : done ? 'text-fg-2' : 'text-muted')}>{tr(s, 'title', locale)}</span>
                  </motion.button>
                );
              })}
              <button
                onClick={() => void go(REVIEW, 1)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start', currentKey === REVIEW ? 'bg-surface shadow-sm ring-1 ring-border' : 'hover:bg-surface-2')}
              >
                <span className={cn('flex size-8 items-center justify-center rounded-lg', currentKey === REVIEW ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>
                  <Send className="size-4 rtl-flip" />
                </span>
                <span className={cn('text-[13px]', currentKey === REVIEW ? 'font-semibold text-fg' : 'text-muted')}>{t('wizard.review')}</span>
              </button>
            </nav>
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1 px-4 pt-8 pb-32 sm:px-8 lg:px-12 lg:pt-12">
            <div className="mx-auto max-w-3xl">
              <AnimatePresence mode="wait" custom={direction}>
                {currentKey === REVIEW ? (
                  <motion.div key="review" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                    <p className="text-xs font-semibold tracking-wide text-brand uppercase">{t('wizard.review')}</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t('wizard.reviewTitle')}</h1>
                    <p className="mt-2 text-muted">{t('wizard.reviewSubtitle')}</p>
                    <div className="mt-8 space-y-4">
                      {steps.map((s) => {
                        const issues = validateStep(s, answers);
                        return (
                          <div key={s.key} className={cn('rounded-2xl bg-surface ring-1', issues.length ? 'ring-danger/40' : 'ring-border')}>
                            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <DynamicIcon name={s.icon} className="size-4 text-brand" />
                                <p className="text-sm font-semibold">{tr(s, 'title', locale)}</p>
                                {issues.length > 0 && <CircleAlert className="size-4 text-danger" />}
                              </div>
                              <Button variant="ghost" size="xs" leftIcon={<Pencil className="size-3.5" />} onClick={() => void go(s.key, -1)}>
                                {t('wizard.editSection')}
                              </Button>
                            </div>
                            <dl className="divide-y divide-border">
                              {visibleQuestions(s, answers).map((q) => (
                                <div key={q.key} className="grid gap-1.5 px-5 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
                                  <dt className="text-[13px] text-muted">{tr(q, 'label', locale)}</dt>
                                  <dd>
                                    <AnswerPreview q={q} value={answers[q.key]} files={filesQ.data ?? []} />
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : step ? (
                  <motion.div key={step.key} custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand uppercase">
                      <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft">
                        <DynamicIcon name={step.icon} className="size-3.5" />
                      </span>
                      {t('wizard.step', { n: index + 1, total: steps.length })}
                    </div>
                    <h1 className="mt-3 text-3xl leading-tight font-semibold sm:text-[40px]">{tr(step, 'title', locale)}</h1>
                    {step.description && <p className="mt-3 text-[15px] text-muted">{tr(step, 'description', locale)}</p>}
                    <div className="mt-10 space-y-10">
                      {visibleQuestions(step, answers).map((q) => (
                        <motion.div key={q.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <QuestionField
                            question={q}
                            value={answers[q.key]}
                            onChange={(v) => setAnswer(q.key, v)}
                            error={errors[q.key]}
                            projectId={id}
                            files={filesQ.data ?? []}
                            onFilesChanged={() => qc.invalidateQueries({ queryKey: ['files', id] })}
                            aiHighlight={aiHighlights[q.key]}
                            onImprove={canImprove && q.type === 'textarea' ? (text) => improve(q.key, text) : undefined}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </main>

          {/* Assistant */}
          <AnimatePresence>
            {showAI && assistantOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-hidden border-s border-border bg-surface xl:block"
              >
                <div className="h-full w-[380px]">
                  <AssistantPanel projectId={id} stepKey={step?.key} workflow={project.workflow} onApply={applySuggestion} onClose={() => setAssistantOpen(false)} />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
          <Drawer open={assistantDrawer} onOpenChange={setAssistantDrawer} title={t('assistant.title')}>
            <AssistantPanel projectId={id} stepKey={step?.key} workflow={project.workflow} onApply={applySuggestion} onClose={() => setAssistantDrawer(false)} />
          </Drawer>
        </div>
      )}

      {/* Bottom nav */}
      {!submitted && (
        <div className={cn('glass fixed inset-x-0 bottom-0 z-20 border-t border-border lg:start-72', showAI && assistantOpen && 'xl:end-[380px]')}>
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
            <Button variant="ghost" onClick={back} disabled={index === 0} leftIcon={<ArrowLeft className="rtl-flip size-4" />}>
              {t('wizard.back')}
            </Button>
            <span className="text-xs text-muted lg:hidden">{t('wizard.step', { n: Math.min(index + 1, steps.length), total: steps.length })}</span>
            {currentKey === REVIEW ? (
              isOwner ? (
                <Button size="lg" onClick={submit} loading={submitting} rightIcon={!submitting ? <Send className="rtl-flip size-4" /> : undefined}>
                  {submitting ? t('wizard.submitting') : project.submittedAt ? t('wizard.submit') : t('wizard.submit')}
                </Button>
              ) : (
                <Button asChild variant="secondary" leftIcon={<X className="size-4" />}>
                  <Link to={`/app/projects/${id}`}>{t('common.close')}</Link>
                </Button>
              )
            ) : (
              <Button size="lg" onClick={next} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
                {index === steps.length - 1 ? t('wizard.review') : t('wizard.next')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
