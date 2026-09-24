import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowUp, CheckCircle2, CircleHelp, Clock, Eye, EyeOff, Lock, LockOpen, MessagesSquare, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import type { Message, Thread } from '../../lib/types';
import { cn, formatDateTime } from '../../lib/utils';
import { Avatar, EmptyState } from '../../components/ui/feedback';
import { Badge } from '../../components/ui/surfaces';
import { Button } from '../../components/ui/button';
import { Tooltip } from '../../components/ui/overlay';

function MessageBubble({ m, mine, canModerate, canResolve, onModerate, onResolve }: {
  m: Message;
  mine: boolean;
  canModerate: boolean;
  canResolve: boolean;
  onModerate: (action: 'approve' | 'hide' | 'unhide') => void;
  onResolve: () => void;
}) {
  const { t, locale } = useI18n();
  const clarification = m.kind === 'CLARIFICATION';
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('group flex gap-3', mine && 'flex-row-reverse')}>
      <Avatar name={m.author?.name ?? 'System'} size="sm" className="mt-5" />
      <div className={cn('max-w-[78%] min-w-0', mine && 'items-end text-end')}>
        <div className={cn('mb-1 flex items-center gap-2 text-[11px] text-muted', mine && 'flex-row-reverse')}>
          <span className="font-medium text-fg-2">{m.author?.name ?? t('chat.system')}</span>
          {m.author && <span>{t(`roles.${m.author.role}`)}</span>}
          <span>{formatDateTime(m.createdAt, locale)}</span>
        </div>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-start text-sm leading-relaxed whitespace-pre-wrap',
            clarification
              ? 'bg-warning-soft text-fg ring-1 ring-warning/25'
              : mine
                ? 'rounded-se-md bg-brand text-white'
                : 'rounded-ss-md bg-surface-2 text-fg',
            m.status === 'HIDDEN' && 'opacity-50 line-through decoration-muted/40',
            m.status === 'PENDING' && 'ring-2 ring-dashed ring-warning/50',
          )}
        >
          {clarification && (
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <CircleHelp className="size-3.5" /> {t('chat.clarification')}
              {m.resolvedAt && <Badge className="bg-success-soft text-success ring-success/20">{t('chat.resolved')}</Badge>}
            </div>
          )}
          {m.body}
        </div>
        <div className={cn('mt-1.5 flex flex-wrap items-center gap-1.5', mine && 'justify-end')}>
          {m.status === 'PENDING' && (
            <Badge className="bg-warning-soft text-warning ring-warning/20">
              <Clock className="size-3" /> {t('chat.pending')}
            </Badge>
          )}
          {m.status === 'HIDDEN' && (
            <Badge>
              <EyeOff className="size-3" /> {t('chat.hidden')}
            </Badge>
          )}
          {canModerate && m.status === 'PENDING' && (
            <Button size="xs" variant="soft" leftIcon={<ShieldCheck className="size-3.5" />} onClick={() => onModerate('approve')}>
              {t('chat.approve')}
            </Button>
          )}
          {canModerate && m.status !== 'HIDDEN' && (
            <Button size="xs" variant="ghost" className="opacity-0 group-hover:opacity-100" leftIcon={<EyeOff className="size-3.5" />} onClick={() => onModerate('hide')}>
              {t('chat.hide')}
            </Button>
          )}
          {canModerate && m.status === 'HIDDEN' && (
            <Button size="xs" variant="ghost" leftIcon={<Eye className="size-3.5" />} onClick={() => onModerate('unhide')}>
              {t('chat.unhide')}
            </Button>
          )}
          {clarification && canResolve && m.status === 'VISIBLE' && (
            <Button size="xs" variant="ghost" leftIcon={<CheckCircle2 className="size-3.5" />} onClick={onResolve}>
              {m.resolvedAt ? t('chat.reopen') : t('chat.markResolved')}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ThreadView({
  thread,
  projectId,
  canModerate,
  canResolve,
  developerClientMode,
  heightClass = 'h-[560px]',
}: {
  thread: Thread;
  projectId: string;
  canModerate: boolean;
  canResolve: boolean;
  developerClientMode?: 'direct' | 'moderated' | 'disabled';
  heightClass?: string;
}) {
  const { t } = useI18n();
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [clarify, setClarify] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['threads', projectId] });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [thread.messages.length]);

  const post = useMutation({
    mutationFn: () => api.post<Message>(`/threads/${thread.id}/messages`, { body, kind: clarify ? 'CLARIFICATION' : 'MESSAGE' }),
    onSuccess: (m) => {
      setBody('');
      setClarify(false);
      if (m.status === 'PENDING') toast.message(t('chat.pending'), { description: t('chat.moderatedNote') });
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const moderate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/messages/${id}/moderate`, { action }),
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resolve = useMutation({ mutationFn: (id: string) => api.post(`/messages/${id}/resolve`), onSuccess: invalidate });
  const lock = useMutation({
    mutationFn: () => api.patch(`/threads/${thread.id}`, { locked: !thread.locked }),
    onSuccess: invalidate,
  });

  const devBlocked = thread.type === 'CLIENT' && user?.role === 'DEVELOPER' && developerClientMode === 'disabled';
  const canPost = (!thread.locked || canModerate) && !devBlocked;

  return (
    <div className={cn('flex flex-col', heightClass)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <MessagesSquare className="size-4 text-brand" />
          {thread.type === 'CLIENT' ? t('chat.clientThread') : t('chat.internalThread')}
          {thread.locked && <Badge><Lock className="size-3" /> {t('chat.lock')}</Badge>}
        </div>
        {canModerate && (
          <Tooltip content={thread.locked ? t('chat.unlock') : t('chat.lock')}>
            <Button size="icon-sm" variant="ghost" onClick={() => lock.mutate()} aria-label={thread.locked ? t('chat.unlock') : t('chat.lock')}>
              {thread.locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
            </Button>
          </Tooltip>
        )}
      </div>

      <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {thread.messages.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="size-6" />} title={t('chat.empty')} description={thread.type === 'CLIENT' ? t('chat.emptyBody') : t('chat.internalNote')} />
        ) : (
          <AnimatePresence initial={false}>
            {thread.messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                mine={m.author?.id === user?.id}
                canModerate={canModerate}
                canResolve={canResolve}
                onModerate={(action) => moderate.mutate({ id: m.id, action })}
                onResolve={() => resolve.mutate(m.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-border p-3">
        {thread.type === 'CLIENT' && user?.role === 'DEVELOPER' && developerClientMode !== 'direct' && (
          <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-warning">
            <ShieldCheck className="size-3.5" /> {developerClientMode === 'disabled' ? t('chat.disabledNote') : t('chat.moderatedNote')}
          </p>
        )}
        {thread.type === 'INTERNAL' && <p className="mb-2 px-1 text-[11px] text-muted">{t('chat.internalNote')}</p>}
        {!canPost ? (
          <p className="py-3 text-center text-sm text-muted">{devBlocked ? t('chat.disabledNote') : t('chat.locked')}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) post.mutate();
            }}
            className={cn('rounded-2xl bg-surface-2 p-1.5 ring-1 focus-within:ring-2 focus-within:ring-brand', clarify ? 'ring-warning/50' : 'ring-border')}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) post.mutate();
              }}
              rows={2}
              maxLength={5000}
              placeholder={clarify ? t('chat.requestClarification') : t('chat.placeholder')}
              className="w-full resize-none bg-transparent px-2.5 py-2 text-sm text-fg outline-none placeholder:text-muted"
            />
            <div className="flex items-center justify-between px-1">
              {isStaff && thread.type === 'CLIENT' ? (
                <button
                  type="button"
                  onClick={() => setClarify((c) => !c)}
                  className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition', clarify ? 'bg-warning-soft text-warning' : 'text-muted hover:text-fg')}
                >
                  <CircleHelp className="size-3.5" /> {t('chat.requestClarification')}
                </button>
              ) : (
                <span />
              )}
              <Button type="submit" size="icon-sm" disabled={!body.trim()} loading={post.isPending} aria-label={t('common.send')}>
                {!post.isPending && <ArrowUp className="size-4" />}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
