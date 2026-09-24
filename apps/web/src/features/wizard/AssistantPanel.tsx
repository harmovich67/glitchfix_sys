import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Check, Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { allQuestions, formatAnswer, tr, type WorkflowDefinition } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { AIChatResult, AIMessageRow, AIStatus, AISuggestion } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Markdown } from '../../components/ui/markdown';
import { Badge } from '../../components/ui/surfaces';

export function useAIStatus() {
  return useQuery({ queryKey: ['ai-status'], queryFn: () => api.get<AIStatus>('/ai/status'), staleTime: 60_000 });
}

interface ChatMsg {
  id: string;
  role: 'USER' | 'MODEL';
  content: string;
  suggestions?: AISuggestion[];
  followUps?: string[];
}

function SuggestionCard({ s, workflow, onApply }: { s: AISuggestion; workflow: WorkflowDefinition; onApply: (s: AISuggestion) => void }) {
  const { t, locale } = useI18n();
  const [applied, setApplied] = useState(false);
  const q = allQuestions(workflow).find((x) => x.key === s.questionKey);
  if (!q) return null;
  const labels = formatAnswer(q, s.values, locale);
  return (
    <div className="mt-2.5 rounded-xl bg-surface p-3 ring-1 ring-border">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{tr(q, 'label', locale)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {labels.map((l) => (
          <span key={l} className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
            {l}
          </span>
        ))}
      </div>
      <button
        type="button"
        disabled={applied}
        onClick={() => {
          onApply(s);
          setApplied(true);
        }}
        className={cn(
          'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition',
          applied ? 'bg-success-soft text-success' : 'bg-brand text-white hover:bg-brand-600',
        )}
      >
        {applied ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        {applied ? t('assistant.applied') : t('assistant.applySuggestion')}
      </button>
    </div>
  );
}

export function AssistantPanel({
  projectId,
  stepKey,
  workflow,
  onApply,
  onClose,
}: {
  projectId: string;
  stepKey?: string;
  workflow: WorkflowDefinition;
  onApply: (s: AISuggestion) => void;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const status = useAIStatus();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ['ai-history', projectId],
    queryFn: () => api.get<AIMessageRow[]>(`/ai/projects/${projectId}/messages`),
  });
  useEffect(() => {
    if (history.data)
      setMessages(history.data.map((m) => ({ id: m.id, role: m.role, content: m.content, suggestions: m.meta?.suggestions, followUps: m.meta?.followUps })));
  }, [history.data]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const chat = useMutation({
    mutationFn: (message: string) => api.post<AIChatResult>('/ai/chat', { projectId, message, stepKey }),
    onMutate: (message) => setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'USER', content: message }]),
    onSuccess: (r) => {
      setMessages((m) => [...m, { id: `m-${Date.now()}`, role: 'MODEL', content: r.reply, suggestions: r.suggestions, followUps: r.followUps }]);
      qc.invalidateQueries({ queryKey: ['ai-status'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setMessages((m) => m.slice(0, -1));
    },
  });

  const send = (text: string) => {
    const v = text.trim();
    if (!v || chat.isPending) return;
    setInput('');
    chat.mutate(v);
  };

  const disabled = status.data && !status.data.enabled;
  const quick = [t('assistant.q1'), t('assistant.q2'), t('assistant.q3'), t('assistant.q4')];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-md">
          <Sparkles className="size-4.5" />
          <span className="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-surface" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{t('assistant.title')}</p>
          <p className="truncate text-xs text-muted">{t('assistant.subtitle')}</p>
        </div>
        {status.data?.mode === 'demo' && <Badge className="bg-warning-soft text-warning ring-warning/20">{t('common.demo')}</Badge>}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label={t('common.close')}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl rounded-ss-md bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg-2">{t('assistant.hello')}</div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={!!disabled}
                className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-fg-2 ring-1 ring-border transition hover:text-brand hover:ring-brand/40"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
              {m.role === 'USER' ? (
                <div className="max-w-[85%] rounded-2xl rounded-se-md bg-brand px-4 py-2.5 text-sm text-white shadow-sm">{m.content}</div>
              ) : (
                <div className="w-full max-w-[95%]">
                  <div className="rounded-2xl rounded-ss-md bg-surface-2 px-4 py-3">
                    <Markdown source={m.content} />
                  </div>
                  {m.suggestions?.map((s, i) => <SuggestionCard key={`${m.id}-${i}`} s={s} workflow={workflow} onApply={onApply} />)}
                  {!!m.followUps?.length && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.followUps.map((f) => (
                        <button key={f} onClick={() => send(f)} className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-2 ring-1 ring-border hover:text-brand">
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {chat.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-1.5 rounded-full bg-brand" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }} />
              ))}
            </span>
            {t('assistant.thinking')}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {disabled ? (
          <p className="px-2 py-3 text-center text-sm text-muted">{t('assistant.disabled')}</p>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 rounded-2xl bg-surface-2 p-1.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-brand"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={t('assistant.placeholder')}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-fg outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!input.trim() || chat.isPending}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition disabled:opacity-40"
                aria-label={t('common.send')}
              >
                <ArrowUp className="size-4" />
              </button>
            </form>
            <p className="mt-2 px-2 text-center text-[11px] text-muted">
              {status.data?.mode === 'demo'
                ? t('assistant.demo')
                : status.data?.remainingToday != null
                  ? t('assistant.remaining', { n: status.data.remainingToday })
                  : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
