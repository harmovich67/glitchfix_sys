import type { Request } from 'express';
import { Prisma, type AISettings } from '@prisma/client';
import {
  OPTION_TYPES,
  allQuestions,
  formatAnswer,
  isEmptyValue,
  tr,
  visibleQuestions,
  visibleSteps,
  type AISettingsInput,
  type AIUsageKind,
  type AnswerMap,
  type WorkflowDefinition,
} from '@welco/shared';
import { prisma } from '../../core/prisma';
import { AppError, badRequest, forbidden, notFound, tooMany } from '../../core/errors';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { assertManage, assertWork, loadProjectAccess } from '../projects/projects.access';
import { settingsService } from '../settings/settings.service';
import { STATUS_LABELS } from '../projects/projects.service';
import { projectsRepository } from '../projects/projects.repository';
import { briefUserSelect } from '../users/users.repository';
import { PERSONAS, effectiveApiKey, getAISettings, publicSettings, updateAISettings } from './ai.settings';
import { geminiGenerate, type GenerateRequest } from './providers/gemini';
import { mockBrief, mockChat, mockImprove } from './providers/mock';
import { mockTaskPlan, mockTechnicalReport, type PlannedTask, type ReportFacts } from './providers/mock-report';
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

const technicalReportInclude = {
  createdBy: { select: briefUserSelect },
  shares: {
    orderBy: { sharedAt: 'desc' },
    include: {
      recipient: { select: briefUserSelect },
      sharedBy: { select: briefUserSelect },
    },
  },
} satisfies Prisma.TechnicalReportInclude;

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

function systemPrompt(s: AISettings, locale: string, brandName: string) {
  return [
    (PERSONAS[s.persona as keyof typeof PERSONAS] ?? PERSONAS.consultant).replace(/\bWelco\b/g, brandName),
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

type ReportProject = NonNullable<Awaited<ReturnType<typeof projectsRepository.findDetail>>>;
type ReportFile = { id: string; originalName: string; category: string; visibility: string };

/** Full, labelled source pack for an engineering report. Facts are kept separate from AI recommendations. */
function technicalReportContext(project: ReportProject, def: WorkflowDefinition, answers: AnswerMap, files: ReportFile[], locale: BriefLocale) {
  const fileNames = new Map(files.map((f) => [f.id, f.originalName]));
  const lines: string[] = [
    '# Source of truth',
    'Everything below is supplied project data. Missing answers are explicitly marked; do not infer them as facts.',
    '',
    '## Project metadata',
    `- Code: ${project.code}`,
    `- Name: ${project.title}`,
    `- Status: ${STATUS_LABELS[project.status as keyof typeof STATUS_LABELS] ?? project.status}`,
    `- Priority: ${project.priority.charAt(0)}${project.priority.slice(1).toLowerCase()}`,
    `- Project type key: ${project.projectType ?? '(not specified)'}`,
    `- Progress: ${project.progress}%`,
    `- Submitted at: ${project.submittedAt?.toISOString() ?? '(not submitted)'}`,
    `- Approved at: ${project.approvedAt?.toISOString() ?? '(not approved)'}`,
    `- Planned start: ${project.startDate?.toISOString() ?? '(not specified)'}`,
    `- Due date: ${project.dueDate?.toISOString() ?? '(not specified)'}`,
    `- Workflow: ${project.template?.name ?? 'Snapshot'} v${project.workflowSnapshot && typeof project.workflowSnapshot === 'object' && 'version' in project.workflowSnapshot ? String(project.workflowSnapshot.version) : project.template?.version ?? 1}`,
    '',
    '## Client context',
    `- Contact: ${project.client.name}`,
    `- Company: ${project.client.clientProfile?.companyName || '(not specified)'}`,
    `- Industry: ${project.client.clientProfile?.industry || '(not specified)'}`,
    `- Country: ${project.client.clientProfile?.country || '(not specified)'}`,
    `- Website: ${project.client.clientProfile?.website || '(not specified)'}`,
    '',
    '## Assigned delivery team',
  ];

  if (project.members.length) {
    for (const member of project.members) {
      const skills = member.user.developerProfile?.skills;
      lines.push(
        `- ${member.user.name} — ${member.role}${member.user.developerProfile?.title ? `, ${member.user.developerProfile.title}` : ''}${Array.isArray(skills) && skills.length ? `; skills: ${skills.join(', ')}` : ''}`,
      );
    }
  } else lines.push('- (No team assigned yet)');

  lines.push('', '## Requirements and client answers');
  for (const step of visibleSteps(def, answers)) {
    lines.push(`### ${tr(step, 'title', locale)} [${step.key}]`);
    for (const q of visibleQuestions(step, answers)) {
      const value = answers[q.key];
      let shown: string;
      if (isEmptyValue(value)) shown = '(unanswered)';
      else if (q.type === 'file') {
        shown = (Array.isArray(value) ? value : []).map((id) => fileNames.get(String(id)) ?? String(id)).join(', ') || '(no files)';
      } else shown = formatAnswer(q, value, locale).join(', ');
      lines.push(`- [${q.key}] ${tr(q, 'label', locale)}: ${shown.slice(0, 4000)}`);
    }
  }

  lines.push('', '## Uploaded project files');
  if (files.length) files.forEach((f) => lines.push(`- ${f.originalName} (${f.category}, ${f.visibility})`));
  else lines.push('- (No files uploaded)');
  return lines.join('\n');
}

const TASK_PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'Short imperative ticket title.' },
          description: { type: 'STRING', description: 'What to build plus acceptance criteria as bullet points.' },
          priority: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          stepKey: { type: 'STRING', description: 'The requirement group (step key) this ticket traces back to, when there is one.' },
          estimateHours: { type: 'INTEGER', description: 'Realistic effort in hours (2-40).' },
        },
        required: ['title', 'description', 'priority'],
      },
    },
  },
  required: ['tasks'],
};

type ReportRow = Prisma.TechnicalReportGetPayload<{ include: typeof technicalReportInclude }>;
type ReportListRow = Omit<ReportRow, 'content'> & { content?: string };
interface RequirementsSnapshot {
  updatedAt: Date;
  answerCount: number;
}

/** What the client requirements look like right now — used to tell when a report is out of date. */
async function requirementsSnapshot(projectId: string, projectCreatedAt: Date): Promise<RequirementsSnapshot> {
  const agg = await prisma.answer.aggregate({ where: { projectId }, _max: { updatedAt: true }, _count: true });
  return { updatedAt: agg._max.updatedAt ?? projectCreatedAt, answerCount: agg._count };
}

function serializeReport(r: ReportListRow, snap: RequirementsSnapshot, viewerId: string, canManage: boolean) {
  return {
    ...r,
    // Recipients only see their own share row; the full audience is a manager concern.
    shares: canManage ? r.shares : r.shares.filter((s) => s.recipientId === viewerId),
    sharedWithMe: r.shares.some((s) => s.recipientId === viewerId),
    stale: r.requirementsUpdatedAt.getTime() < snap.updatedAt.getTime() || r.answerCount !== snap.answerCount,
  };
}

/** Insert the next version number for a project, retrying if two managers generate at once. */
async function createReportVersion(data: Omit<Prisma.TechnicalReportUncheckedCreateInput, 'version'>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.technicalReport.aggregate({ where: { projectId: data.projectId }, _max: { version: true } });
    try {
      return await prisma.technicalReport.create({ data: { ...data, version: (last._max.version ?? 0) + 1 }, include: technicalReportInclude });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new AppError(409, 'CONFLICT', 'Another report was generated at the same time. Please try again.');
}

function reportFacts(project: ReportProject): ReportFacts {
  const cp = project.client.clientProfile;
  return {
    code: project.code,
    title: project.title,
    status: STATUS_LABELS[project.status as keyof typeof STATUS_LABELS] ?? project.status,
    priority: project.priority.charAt(0) + project.priority.slice(1).toLowerCase(),
    projectType: project.projectType,
    progress: project.progress,
    dueDate: project.dueDate?.toISOString() ?? null,
    client: {
      name: project.client.name,
      company: cp?.companyName ?? '',
      industry: cp?.industry ?? '',
      country: cp?.country ?? '',
      website: cp?.website ?? '',
    },
    team: project.members.map((m) => ({ name: m.user.name, role: m.role, title: m.user.developerProfile?.title ?? null })),
  };
}

async function loadReportSources(projectId: string) {
  const project = await projectsRepository.findDetail(projectId);
  if (!project) throw notFound('Project');
  const [answers, files] = await Promise.all([
    projectsRepository.answerMap(projectId),
    prisma.file.findMany({ where: { projectId }, select: { id: true, originalName: true, category: true, visibility: true } }),
  ]);
  const def = project.workflowSnapshot as unknown as WorkflowDefinition;
  return { project, def, answers, files, fileNames: new Map(files.map((f) => [f.id, f.originalName])) };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

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
        system: systemPrompt(s, user.locale, (({ brand }) => (user.locale === 'ar' ? brand.nameAr : brand.nameEn))(await settingsService.get())),
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

  // ── Technical reports ──────────────────────────────────────────────────────
  /** Version history for a project. Managers see every version; developers only those shared with them. */
  async technicalReports(user: AuthUser, projectId: string) {
    const access = await loadProjectAccess(user, projectId);
    assertWork(access);
    const canManage = access.canManage;
    const [rows, snap] = await Promise.all([
      prisma.technicalReport.findMany({
        where: { projectId, ...(canManage ? {} : { shares: { some: { recipientId: user.id } } }) },
        orderBy: { version: 'desc' },
        include: technicalReportInclude,
        omit: { content: true },
      }),
      requirementsSnapshot(projectId, access.project.createdAt),
    ]);
    return {
      canGenerate: canManage,
      canShare: canManage,
      current: { requirementsUpdatedAt: snap.updatedAt, answerCount: snap.answerCount },
      reports: rows.map((r) => serializeReport(r, snap, user.id, canManage)),
    };
  },

  /** One report with its full content, for a manager of the project or a colleague it was shared with. */
  async technicalReport(user: AuthUser, reportId: string) {
    const report = await prisma.technicalReport.findUnique({
      where: { id: reportId },
      include: { ...technicalReportInclude, project: { select: { id: true, code: true, title: true, createdAt: true } } },
    });
    if (!report) throw notFound('Report');
    let canManage = false;
    try {
      const access = await loadProjectAccess(user, report.projectId);
      canManage = access.canManage && access.canWork;
    } catch {
      /* not on the project — a share is the only way in */
    }
    if (!canManage && !report.shares.some((s) => s.recipientId === user.id)) throw notFound('Report');
    const { project, ...row } = report;
    const snap = await requirementsSnapshot(project.id, project.createdAt);
    return { ...serializeReport(row, snap, user.id, canManage), project: { id: project.id, code: project.code, title: project.title }, canManage };
  },

  /** Reports other people shared with the signed-in user (their inbox). */
  async sharedTechnicalReports(user: AuthUser) {
    const rows = await prisma.technicalReportShare.findMany({
      where: { recipientId: user.id },
      orderBy: { sharedAt: 'desc' },
      take: 50,
      include: {
        sharedBy: { select: briefUserSelect },
        report: {
          omit: { content: true },
          include: { createdBy: { select: briefUserSelect }, project: { select: { id: true, code: true, title: true } } },
        },
      },
    });
    return rows.map((s) => ({ shareId: s.id, sharedAt: s.sharedAt, sharedBy: s.sharedBy, report: s.report }));
  },

  async generateTechnicalReport(req: Request, user: AuthUser, projectId: string, requested?: string) {
    const s = await ensureEnabled();
    const access = await loadProjectAccess(user, projectId);
    assertManage(access);
    await assertQuota(s, user.id);
    const locale: BriefLocale = isBriefLocale(requested) ? requested : isBriefLocale(user.locale) ? user.locale : 'en';
    const { project, def, answers, files, fileNames } = await loadReportSources(projectId);
    const snap = await requirementsSnapshot(projectId, project.createdAt);
    const apiKey = effectiveApiKey(s);
    const ar = locale === 'ar';

    let content: string;
    let model: string | null = null;
    let mock = false;
    if (!apiKey) {
      content = mockTechnicalReport({ facts: reportFacts(project), def, answers, files: fileNames, locale });
      mock = true;
      await recordUsage(user.id, projectId, 'TECHNICAL_REPORT', 0, 0, true);
    } else {
      const sections = ar
        ? '1. الملخص التنفيذي، 2. سياق المشروع والعميل، 3. المتطلبات الوظيفية (بمعرّفات FR-01… وأولوية MoSCoW)، 4. المتطلبات غير الوظيفية، 5. المعمارية والتقنيات المقترحة، 6. التكاملات والملفات، 7. خطة التنفيذ (مراحل مع تقدير ساعات)، 8. المخاطر والافتراضات، 9. الأسئلة المفتوحة، 10. تعريف الاكتمال'
        : '1. Executive summary, 2. Project & client context, 3. Functional requirements (IDs FR-01…, MoSCoW priority), 4. Non-functional requirements, 5. Recommended architecture & stack, 6. Integrations & assets, 7. Delivery plan (phases with hour estimates), 8. Risks & assumptions, 9. Open questions, 10. Definition of done';
      const gen = await generateWithFallback(s, apiKey, {
        system: [
          'You are a senior technical lead writing an engineering report that the delivery team will build from.',
          `Output GitHub markdown: one "# " title, then these numbered "## " sections in this exact order: ${sections}. Use "### " for sub-groups, bullet lists and **bold** labels; do not use tables or HTML.`,
          'Separate facts from opinions: everything derived from the supplied client data is a fact; anything you add (architecture, stack, estimates, risks) must be clearly a recommendation or assumption, and section 5 must open with an italic line saying it is an AI recommendation.',
          'Never invent client requirements, brands, numbers or integrations. Put every gap or ambiguity under "Open questions" instead of guessing. Be concrete and concise — a developer should be able to start from it.',
          'The output language is only the reader preference and says nothing about the product (it does not mean the product needs that language).',
          ar
            ? 'Write the ENTIRE report — headings included — in clear Modern Standard Arabic even though the data is in English. Keep product/brand names, URLs and technical terms (API, CRM, SEO, React…) in Latin script.'
            : 'Write the entire report in English, translating any Arabic client answers.',
        ].join('\n'),
        history: [],
        prompt: technicalReportContext(project, def, answers, files, locale),
        temperature: 0.3,
        maxOutputTokens: Math.max(s.maxOutputTokens, 8192),
        timeoutMs: 120_000,
      });
      if (!gen.text.trim()) throw new AppError(502, 'AI_EMPTY', 'The AI returned an empty report. Please try again.');
      content = gen.text.trim();
      model = gen.model;
      await recordUsage(user.id, projectId, 'TECHNICAL_REPORT', gen.inputTokens, gen.outputTokens, false);
    }

    const created = await createReportVersion({
      projectId,
      locale,
      content,
      model,
      mock,
      requirementsUpdatedAt: snap.updatedAt,
      answerCount: snap.answerCount,
      createdById: user.id,
    });
    await projectsRepository.addEvent(projectId, {
      type: 'technical_report',
      title: `Technical report v${created.version} generated (${ar ? 'Arabic' : 'English'})`,
      actorId: user.id,
      visibility: 'INTERNAL',
      meta: { reportId: created.id, version: created.version, locale },
    });
    await auditService.log(req, {
      action: 'ai.technical_report_generated',
      entityType: 'TechnicalReport',
      entityId: created.id,
      meta: { projectId, version: created.version, locale, mock },
    });
    return serializeReport(created, snap, user.id, true);
  },

  /** Send a report to team members: they get a notification and it appears in their dashboard inbox. */
  async shareTechnicalReport(req: Request, user: AuthUser, projectId: string, reportId: string, userIds: string[]) {
    const access = await loadProjectAccess(user, projectId);
    assertManage(access);
    const report = await prisma.technicalReport.findFirst({ where: { id: reportId, projectId }, select: { id: true, version: true } });
    if (!report) throw notFound('Report');

    const ids = [...new Set(userIds)];
    const recipients = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true, role: 'DEVELOPER' }, select: { id: true } });
    if (recipients.length !== ids.length) throw badRequest('Reports can only be shared with active developers');

    const existing = await prisma.technicalReportShare.findMany({ where: { reportId, recipientId: { in: ids } }, select: { recipientId: true } });
    const already = new Set(existing.map((e) => e.recipientId));
    const fresh = ids.filter((id) => !already.has(id) && id !== user.id);
    if (fresh.length) {
      await prisma.technicalReportShare.createMany({ data: fresh.map((recipientId) => ({ reportId, recipientId, sharedById: user.id })) });
      await notificationsService.notify(fresh, {
        type: 'report.shared',
        title: `Technical report v${report.version} · ${access.project.code}`,
        body: `${user.name} shared the technical report for “${access.project.title}” with you.`,
        link: `/app/reports/${reportId}`,
        email: true,
      });
      await projectsRepository.addEvent(projectId, {
        type: 'technical_report',
        title: `Technical report v${report.version} shared with ${fresh.length} team member(s)`,
        actorId: user.id,
        visibility: 'INTERNAL',
        meta: { reportId, version: report.version, recipients: fresh },
      });
      await auditService.log(req, { action: 'ai.technical_report_shared', entityType: 'TechnicalReport', entityId: reportId, meta: { projectId, recipients: fresh } });
    }
    return this.technicalReport(user, reportId);
  },

  async unshareTechnicalReport(req: Request, user: AuthUser, projectId: string, reportId: string, recipientId: string) {
    assertManage(await loadProjectAccess(user, projectId));
    const share = await prisma.technicalReportShare.findFirst({ where: { reportId, recipientId, report: { projectId } } });
    if (!share) throw notFound('Share');
    await prisma.technicalReportShare.delete({ where: { id: share.id } });
    await auditService.log(req, { action: 'ai.technical_report_unshared', entityType: 'TechnicalReport', entityId: reportId, meta: { projectId, recipientId } });
    return this.technicalReport(user, reportId);
  },

  // ── Requirements → tickets ─────────────────────────────────────────────────
  /** Propose implementation tickets from the requirements (and optionally a report). Nothing is saved until a manager approves. */
  async taskPlan(user: AuthUser, projectId: string, input: { reportId?: string; locale?: string }) {
    const s = await ensureEnabled();
    const access = await loadProjectAccess(user, projectId);
    assertManage(access);
    await assertQuota(s, user.id);
    const locale: BriefLocale = isBriefLocale(input.locale) ? input.locale : isBriefLocale(user.locale) ? user.locale : 'en';
    const { project, def, answers, files, fileNames } = await loadReportSources(projectId);
    const stepKeys = new Set(def.steps.map((st) => st.key));

    let reportText = '';
    if (input.reportId) {
      const report = await prisma.technicalReport.findFirst({ where: { id: input.reportId, projectId }, select: { content: true } });
      if (!report) throw notFound('Report');
      reportText = report.content;
    }

    const apiKey = effectiveApiKey(s);
    let planned: PlannedTask[];
    let mock = false;
    if (!apiKey) {
      planned = mockTaskPlan({ def, answers, files: fileNames, locale });
      mock = true;
      await recordUsage(user.id, projectId, 'TASK_PLAN', 0, 0, true);
    } else {
      const gen = await generateWithFallback(s, apiKey, {
        system: [
          'You are a technical project lead turning client requirements into implementation tickets for developers.',
          'Each ticket is one deliverable a developer can finish in roughly 2-16 hours, specific and testable. Put acceptance criteria as bullet points in the description.',
          'Cover real requirements only — never invent features. Add the foundational tickets every project needs (setup, QA, deployment) and no more than 40 tickets in total.',
          `stepKey must be one of: ${[...stepKeys].join(', ')} — or omitted for cross-cutting work.`,
          locale === 'ar' ? 'Write titles and descriptions in clear Modern Standard Arabic (keep technical terms in Latin script).' : 'Write titles and descriptions in English.',
        ].join('\n'),
        history: [],
        prompt: `${technicalReportContext(project, def, answers, files, locale)}${reportText ? `\n\n# Approved technical report (use it for scope and priorities)\n${reportText.slice(0, 14000)}` : ''}`,
        temperature: 0.3,
        maxOutputTokens: Math.max(s.maxOutputTokens, 8192),
        responseSchema: TASK_PLAN_SCHEMA,
        timeoutMs: 120_000,
      });
      await recordUsage(user.id, projectId, 'TASK_PLAN', gen.inputTokens, gen.outputTokens, false);
      let raw: { tasks?: Partial<PlannedTask>[] };
      try {
        raw = JSON.parse(gen.text);
      } catch {
        throw new AppError(502, 'AI_BAD_OUTPUT', 'The AI returned an unreadable plan. Please try again.');
      }
      planned = (raw.tasks ?? [])
        .filter((t) => typeof t.title === 'string' && t.title.trim())
        .slice(0, 40)
        .map((t) => ({
          title: String(t.title).trim().slice(0, 200),
          description: String(t.description ?? '').slice(0, 2000),
          priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).find((p) => p === t.priority) ?? 'MEDIUM',
          stepKey: t.stepKey && stepKeys.has(t.stepKey) ? t.stepKey : null,
          estimateHours: Number.isFinite(t.estimateHours) ? Math.min(2000, Math.max(0, Math.round(Number(t.estimateHours)))) : null,
        }));
    }

    const existing = await prisma.task.findMany({ where: { projectId, source: 'REQUIREMENT' }, select: { title: true } });
    const taken = new Set(existing.map((t) => norm(t.title)));
    return { mock, items: planned.map((p) => ({ ...p, duplicate: taken.has(norm(p.title)) })) };
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
