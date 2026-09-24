import type { Request } from 'express';
import { Prisma, type AISettings } from '@prisma/client';
import {
  OPTION_TYPES,
  allQuestions,
  formatAnswer,
  isEmptyValue,
  visibleQuestions,
  visibleSteps,
  type AISettingsInput,
  type AIUsageKind,
  type AnswerMap,
  type WorkflowDefinition,
} from '@welco/shared';
import { prisma } from '../../core/prisma';
import { AppError, forbidden, tooMany } from '../../core/errors';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { assertWork, loadProjectAccess } from '../projects/projects.access';
import { projectsRepository } from '../projects/projects.repository';
import { PERSONAS, effectiveApiKey, getAISettings, publicSettings, updateAISettings } from './ai.settings';
import { geminiGenerate, type GenerateRequest } from './providers/gemini';
import { mockBrief, mockChat, mockImprove } from './providers/mock';
import { isBriefLocale, parseBriefs, serializeBriefs, type BriefLocale, type BriefMap, type StoredBrief } from './brief-store';

export interface ChatResult {
  reply: string;
  suggestions: { questionKey: string; values: string[]; reason?: string }[];
  followUps: string[];
  mock: boolean;
}

const CHAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING', description: 'Answer to the client, markdown allowed (bold, bullets).' },
    suggestions: {
      type: 'ARRAY',
      description: 'Answers the client can apply with one click. Only use question keys and option values from the context.',
      items: {
        type: 'OBJECT',
        properties: {
          questionKey: { type: 'STRING' },
          values: { type: 'ARRAY', items: { type: 'STRING' } },
          reason: { type: 'STRING', description: 'One short sentence, in the same language as the reply.' },
        },
        required: ['questionKey', 'values'],
      },
    },
    followUps: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Up to 2 short follow-up questions.' },
  },
  required: ['reply'],
};

/**
 * Call the main model, then each configured fallback in order, when the provider is overloaded,
 * rate-limited or unreachable. Non-transient errors (bad key, blocked prompt…) fail immediately.
 */
async function generateWithFallback(s: AISettings, apiKey: string, req: Omit<GenerateRequest, 'model' | 'apiKey'>) {
  const models = [s.model, ...s.fallbackModels.split(',')].map((m) => m.trim()).filter((m, i, all) => m && all.indexOf(m) === i);
  let last: unknown;
  for (const model of models) {
    try {
      return { ...(await geminiGenerate({ ...req, model, apiKey })), model };
    } catch (err) {
      last = err;
      const retryable = err instanceof AppError && (err.details as { retryable?: boolean } | undefined)?.retryable;
      if (!retryable) throw err;
      console.warn(`[ai] ${model} unavailable — ${(err as Error).message}`);
    }
  }
  throw new AppError(503, 'AI_BUSY', 'The AI assistant is busy right now. Please try again in a minute.', {
    tried: models,
    lastError: (last as Error | undefined)?.message,
  });
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function usedToday(userId: string) {
  return prisma.aIUsage.count({ where: { userId, createdAt: { gte: startOfDay() }, kind: { not: 'TEST' } } });
}

async function assertQuota(s: AISettings, userId: string) {
  if (s.dailyUserLimit > 0 && (await usedToday(userId)) >= s.dailyUserLimit)
    throw tooMany(`You reached today's assistant limit (${s.dailyUserLimit} requests). It resets tomorrow.`);
  if (s.monthlyTokenLimit > 0) {
    const agg = await prisma.aIUsage.aggregate({
      where: { createdAt: { gte: startOfMonth() } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    const used = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
    if (used >= s.monthlyTokenLimit) throw tooMany('The assistant has reached its monthly usage limit. Please try again next month.');
  }
}

function recordUsage(userId: string, projectId: string | null, kind: AIUsageKind, inTok: number, outTok: number, mock: boolean) {
  return prisma.aIUsage.create({ data: { userId, projectId, kind, inputTokens: inTok, outputTokens: outTok, mock } });
}

function systemPrompt(s: AISettings, locale: string) {
  return [
    PERSONAS[s.persona as keyof typeof PERSONAS] ?? PERSONAS.consultant,
    s.systemPrompt,
    !s.allowExplain ? 'Do not give long explanations of technical terms; keep definitions to a few words.' : '',
    `Reply in the language the client writes in (Arabic → clear, friendly Modern Standard Arabic). If unclear, reply in ${locale === 'ar' ? 'Arabic' : 'English'}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Compact, token-efficient description of the journey and the client's answers. */
function journeyContext(def: WorkflowDefinition, answers: AnswerMap, currentStep?: string) {
  const lines: string[] = ['## Discovery journey (question keys in brackets)'];
  for (const step of visibleSteps(def, answers)) {
    lines.push(`### ${step.title}${step.key === currentStep ? '  ← client is here' : ''}`);
    for (const q of visibleQuestions(step, answers)) {
      const value = answers[q.key];
      const answer = isEmptyValue(value) ? '(unanswered)' : q.type === 'file' ? `${(value as string[]).length} file(s)` : formatAnswer(q, value).join(', ');
      lines.push(`- [${q.key}] ${q.label} (${q.type}) → ${answer.slice(0, 400)}`);
      if (OPTION_TYPES.includes(q.type) && q.options?.length)
        lines.push(`  options: ${q.options.map((o) => `${o.value}="${o.label}"`).join('; ')}`);
      if (q.aiHint) lines.push(`  hint: ${q.aiHint}`);
    }
  }
  // Feature lists on branches not yet visible, so the AI can suggest a project type *and* its features at once.
  const shown = new Set(visibleSteps(def, answers).flatMap((s) => visibleQuestions(s, answers).map((q) => q.key)));
  const hidden = allQuestions(def).filter((q) => q.type === 'feature_checklist' && q.enabled && !shown.has(q.key));
  if (hidden.length) {
    lines.push('', '## Feature lists shown for other project types (suggest only if they match the chosen type)');
    for (const q of hidden) {
      const when = q.conditions?.rules.map((r) => `${r.question} ${r.op} ${[r.value].flat().join('|')}`).join(' & ');
      lines.push(`- [${q.key}] ${q.label}${when ? ` (when ${when})` : ''}`);
      lines.push(`  options: ${(q.options ?? []).map((o) => `${o.value}="${o.label}"`).join('; ')}`);
    }
  }
  return lines.join('\n');
}

/** Keep only suggestions that reference real option questions and valid values. */
function sanitizeSuggestions(def: WorkflowDefinition, raw: ChatResult['suggestions']) {
  const qs = new Map(allQuestions(def).map((q) => [q.key, q]));
  return (raw ?? [])
    .map((s) => {
      const q = qs.get(s.questionKey);
      if (!q || !OPTION_TYPES.includes(q.type) || !q.options?.length) return null;
      const allowed = new Set(q.options.map((o) => o.value));
      const values = [...new Set((s.values ?? []).filter((v) => allowed.has(v)))];
      const single = q.type === 'single_choice' || q.type === 'select' || (q.type === 'visual_choice' && q.validation?.max === 1);
      if (!values.length) return null;
      return { questionKey: s.questionKey, values: single ? values.slice(0, 1) : values, reason: s.reason?.slice(0, 200) };
    })
    .filter(Boolean)
    .slice(0, 4) as ChatResult['suggestions'];
}

async function ensureEnabled() {
  const s = await getAISettings();
  if (!s.enabled) throw forbidden('The AI assistant is currently disabled');
  return s;
}

export const aiService = {
  async status(user: AuthUser) {
    const s = await getAISettings();
    const used = await usedToday(user.id);
    return {
      enabled: s.enabled,
      mode: effectiveApiKey(s) ? 'live' : 'demo',
      features: { suggest: s.allowSuggest, improve: s.allowImprove, explain: s.allowExplain },
      remainingToday: s.dailyUserLimit > 0 ? Math.max(0, s.dailyUserLimit - used) : null,
    };
  },

  async history(user: AuthUser, projectId: string) {
    await loadProjectAccess(user, projectId);
    return prisma.aIMessage.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' }, take: 100 });
  },

  async chat(user: AuthUser, input: { projectId: string; message: string; stepKey?: string }) {
    const s = await ensureEnabled();
    const access = await loadProjectAccess(user, input.projectId);
    if (!access.isOwner && !access.canWork) throw forbidden();
    await assertQuota(s, user.id);

    const def = access.project.workflowSnapshot as unknown as WorkflowDefinition;
    const answers = await projectsRepository.answerMap(input.projectId);
    const history = await prisma.aIMessage.findMany({ where: { projectId: input.projectId }, orderBy: { createdAt: 'desc' }, take: 10 });
    const apiKey = effectiveApiKey(s);

    let result: ChatResult;
    if (!apiKey) {
      result = mockChat({ message: input.message, locale: user.locale, def, answers });
      await recordUsage(user.id, input.projectId, 'CHAT', 0, 0, true);
    } else {
      const gen = await generateWithFallback(s, apiKey, {
        system: systemPrompt(s, user.locale),
        history: history.reverse().map((m) => ({ role: m.role === 'USER' ? 'user' : 'model', text: m.content })),
        prompt: `${journeyContext(def, answers, input.stepKey)}\n\n${
          s.allowSuggest
            ? '## Output rule\nWhenever you recommend features or answers, ALSO return them in `suggestions` using the exact question keys and option values listed above, so the client can add them with one click. If the client describes a different kind of project than the one selected, suggest the matching `project_type` too.\n\n'
            : ''
        }## Client message\n${input.message}`,
        temperature: s.temperature,
        maxOutputTokens: s.maxOutputTokens,
        responseSchema: CHAT_SCHEMA,
      });
      await recordUsage(user.id, input.projectId, 'CHAT', gen.inputTokens, gen.outputTokens, false);
      let parsed: Partial<ChatResult>;
      try {
        parsed = JSON.parse(gen.text);
      } catch {
        parsed = { reply: gen.text };
      }
      result = {
        reply: String(parsed.reply ?? '').slice(0, 4000),
        suggestions: parsed.suggestions ?? [],
        followUps: (parsed.followUps ?? []).slice(0, 2).map((f) => String(f).slice(0, 200)),
        mock: false,
      };
    }
    result.suggestions = s.allowSuggest ? sanitizeSuggestions(def, result.suggestions) : [];

    await prisma.aIMessage.createMany({
      data: [
        { projectId: input.projectId, userId: user.id, role: 'USER', content: input.message },
        {
          projectId: input.projectId,
          userId: null,
          role: 'MODEL',
          content: result.reply,
          meta: { suggestions: result.suggestions, followUps: result.followUps, mock: result.mock } as Prisma.InputJsonValue,
        },
      ],
    });
    return result;
  },

  async improve(user: AuthUser, input: { projectId: string; questionKey: string; text: string }) {
    const s = await ensureEnabled();
    if (!s.allowImprove) throw forbidden('Answer improvement is disabled');
    const access = await loadProjectAccess(user, input.projectId);
    if (!access.isOwner && !access.canWork) throw forbidden();
    await assertQuota(s, user.id);

    const def = access.project.workflowSnapshot as unknown as WorkflowDefinition;
    const q = allQuestions(def).find((x) => x.key === input.questionKey);
    const apiKey = effectiveApiKey(s);
    if (!apiKey) {
      await recordUsage(user.id, input.projectId, 'IMPROVE', 0, 0, true);
      return { text: mockImprove(input.text), mock: true };
    }
    const gen = await generateWithFallback(s, apiKey, {
      system: `${PERSONAS.consultant}\nRewrite the client's answer so it is clear, specific and professional. Keep every fact, add no invented details, keep the same language as the original, and return only the rewritten text (max 120 words).`,
      history: [],
      prompt: `Question: ${q?.label ?? input.questionKey}\n${q?.aiHint ? `What we need: ${q.aiHint}\n` : ''}Client answer:\n"""${input.text}"""`,
      temperature: Math.min(s.temperature, 0.5),
      maxOutputTokens: s.maxOutputTokens,
    });
    await recordUsage(user.id, input.projectId, 'IMPROVE', gen.inputTokens, gen.outputTokens, false);
    return { text: gen.text.replace(/^"+|"+$/g, '').trim(), mock: false };
  },

  /** Generate (or refresh) the brief in one language; versions in other languages are kept. */
  async brief(req: Request, user: AuthUser, projectId: string, requested?: string) {
    const s = await ensureEnabled();
    const access = await loadProjectAccess(user, projectId);
    assertWork(access);
    const locale: BriefLocale = isBriefLocale(requested) ? requested : isBriefLocale(user.locale) ? user.locale : 'en';
    const def = access.project.workflowSnapshot as unknown as WorkflowDefinition;
    const answers = await projectsRepository.answerMap(projectId);
    const files = new Map(
      (await prisma.file.findMany({ where: { projectId }, select: { id: true, originalName: true } })).map((f) => [f.id, f.originalName]),
    );
    const apiKey = effectiveApiKey(s);
    let entry: StoredBrief;
    if (!apiKey) {
      entry = { text: mockBrief({ title: access.project.title, code: access.project.code, def, answers, files, locale }), generatedAt: new Date().toISOString(), mock: true };
      await recordUsage(user.id, projectId, 'BRIEF', 0, 0, true);
    } else {
      const ar = locale === 'ar';
      const sections = ar
        ? 'الملخص، الأهداف، الجمهور المستهدف، النطاق والميزات (مجمّعة مع أولوية MoSCoW)، الاتجاه التصميمي، التكاملات، المحتوى والملفات، المخاطر والأسئلة المفتوحة، المراحل المقترحة'
        : 'Summary, Goals, Audience, Scope & Features (grouped, with MoSCoW priority), Design Direction, Integrations, Content & Assets, Risks & Open Questions, Suggested Phases';
      const gen = await generateWithFallback(s, apiKey, {
        system: [
          'You are a senior solutions architect writing an internal project brief for a delivery team.',
          `Output GitHub markdown with these sections: ${sections}.`,
          'Be concise and concrete. Use only the information provided; never add facts, and list gaps under Open Questions.',
          'The language you write in is only the reader’s preference — it says nothing about the project (e.g. it does not mean the product needs that language).',
          ar
            ? 'Write the ENTIRE brief — headings included — in clear Modern Standard Arabic, even though the project data below is in English. Keep product names, brand names, URLs and technical acronyms (API, CRM, SEO…) as they are.'
            : 'Write the entire brief in English, translating any Arabic client answers.',
        ].join('\n'),
        history: [],
        prompt: `Project ${access.project.code}: ${access.project.title}\n\n${journeyContext(def, answers)}`,
        temperature: 0.4,
        maxOutputTokens: Math.max(s.maxOutputTokens, 2048),
      });
      entry = { text: gen.text, generatedAt: new Date().toISOString(), model: gen.model };
      await recordUsage(user.id, projectId, 'BRIEF', gen.inputTokens, gen.outputTokens, false);
    }
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { aiBrief: true, updatedAt: true } });
    const briefs: BriefMap = { ...parseBriefs(project.aiBrief, project.updatedAt), [locale]: entry };
    await projectsRepository.update(projectId, { aiBrief: serializeBriefs(briefs) });
    await projectsRepository.addEvent(projectId, {
      type: 'brief',
      title: locale === 'ar' ? 'AI project brief generated (Arabic)' : 'AI project brief generated (English)',
      actorId: user.id,
      visibility: 'INTERNAL',
      meta: { locale },
    });
    await auditService.log(req, { action: 'ai.brief_generated', entityType: 'Project', entityId: projectId, meta: { locale } });
    return { locale, briefs };
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  async settings() {
    return publicSettings(await getAISettings());
  },

  async updateSettings(req: Request, user: AuthUser, input: AISettingsInput) {
    const before = await getAISettings();
    const after = await updateAISettings(input, user.id);
    const changed = Object.keys(input).filter(
      (k) => k !== 'apiKey' && (before as Record<string, unknown>)[k] !== (after as Record<string, unknown>)[k],
    );
    if (input.apiKey) changed.push(input.apiKey === '__clear__' ? 'apiKey(cleared)' : 'apiKey(updated)');
    await auditService.log(req, { action: 'ai.settings_updated', entityType: 'AISettings', entityId: '1', meta: { changed } });
    return publicSettings(after);
  },

  async test(user: AuthUser) {
    const s = await getAISettings();
    const apiKey = effectiveApiKey(s);
    if (!apiKey) return { ok: true, mode: 'demo', message: 'No API key configured — the assistant runs in offline demo mode.' };
    const started = Date.now();
    try {
      const gen = await generateWithFallback(s, apiKey, {
        system: 'Reply with a short friendly greeting.',
        history: [],
        prompt: 'Say hello in 5 words.',
        temperature: 0.2,
        maxOutputTokens: Math.max(256, Math.min(s.maxOutputTokens, 1024)),
      });
      await recordUsage(user.id, null, 'TEST', gen.inputTokens, gen.outputTokens, false);
      return { ok: true, mode: 'live', message: gen.text, latencyMs: Date.now() - started, model: gen.model, fallbackUsed: gen.model !== s.model };
    } catch (err) {
      return { ok: false, mode: 'live', message: err instanceof AppError ? err.message : String(err), model: s.model };
    }
  },

  async usage() {
    const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    const rows = await prisma.aIUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, inputTokens: true, outputTokens: true, kind: true, userId: true, mock: true },
    });
    const days = new Map<string, { date: string; requests: number; tokens: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.set(key, { date: key, requests: 0, tokens: 0 });
    }
    const byKind: Record<string, number> = {};
    const byUser = new Map<string, number>();
    for (const r of rows) {
      const day = days.get(r.createdAt.toISOString().slice(0, 10));
      if (day) {
        day.requests++;
        day.tokens += r.inputTokens + r.outputTokens;
      }
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
      byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
    }
    const monthAgg = await prisma.aIUsage.aggregate({
      where: { createdAt: { gte: startOfMonth() } },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true,
    });
    const topIds = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const users = await prisma.user.findMany({ where: { id: { in: topIds.map(([id]) => id) } }, select: { id: true, name: true, role: true } });
    return {
      series: [...days.values()],
      byKind,
      month: {
        requests: monthAgg._count,
        tokens: (monthAgg._sum.inputTokens ?? 0) + (monthAgg._sum.outputTokens ?? 0),
      },
      topUsers: topIds.map(([id, count]) => ({ ...users.find((u) => u.id === id), count })),
    };
  },
};
