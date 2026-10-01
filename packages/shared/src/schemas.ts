import { z } from 'zod';
import { ROLES } from './roles';
import { CURRENCIES } from './proposal';
import {
  LEAVE_KINDS,
  TIMEOFF_TYPES,
  AI_PERSONAS,
  DEV_CLIENT_MODES,
  FILE_CATEGORIES,
  MEMBER_ROLES,
  MESSAGE_KINDS,
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  VISIBILITIES,
} from './constants';
import { CONDITION_OPS, QUESTION_TYPES } from './workflow';

const key = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores');

const translations = z.record(z.string(), z.record(z.string(), z.string().max(2000))).nullish();

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'At least 8 characters').max(200),
  companyName: z.string().trim().max(120).optional().default(''),
  locale: z.enum(['en', 'ar']).optional().default('en'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'At least 8 characters').max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  locale: z.enum(['en', 'ar']).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
  // Staff contact details; an empty string clears the field.
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  altEmail: z.union([z.literal(''), z.string().trim().email().max(120)]).optional(),
  emergencyName: z.string().trim().max(80).optional(),
  emergencyPhone: z.string().trim().max(40).optional(),
});

// ─── Users ─────────────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ROLES),
  password: z.string().min(8).max(200),
  title: z.string().max(80).optional(),
  skills: z.array(z.string().max(40)).max(30).optional(),
});
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  title: z.string().max(80).optional(),
  skills: z.array(z.string().max(40)).max(30).optional(),
  capacity: z.number().int().min(0).max(50).optional(),
  /** Only a Super Admin may change this: lets a staff member see prices, offers and the client's budget. */
  financeAccess: z.boolean().optional(),
});
export const updateClientSchema = z.object({
  companyName: z.string().max(120).optional(),
  industry: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  website: z.string().max(200).optional(),
  internalNotes: z.string().max(5000).optional(),
});

// ─── Workflow ──────────────────────────────────────────────────────────────────
export const conditionSchema = z
  .object({
    match: z.enum(['all', 'any']),
    rules: z
      .array(
        z.object({
          question: key,
          op: z.enum(CONDITION_OPS),
          value: z.union([z.string().max(200), z.array(z.string().max(200)).max(50)]).optional(),
        }),
      )
      .max(20),
  })
  .nullish();

export const optionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  description: z.string().max(400).optional(),
  icon: z.string().max(60).optional(),
  preview: z.string().max(60).optional(),
  image: z.string().max(500).optional(),
  i18n: translations,
});

export const questionSchema = z.object({
  id: z.string().optional(),
  key,
  type: z.enum(QUESTION_TYPES),
  label: z.string().trim().min(1).max(300),
  placeholder: z.string().max(300).nullish(),
  helpText: z.string().max(1000).nullish(),
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0),
  options: z.array(optionSchema).max(60).nullish(),
  conditions: conditionSchema,
  validation: z
    .object({
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(0).optional(),
      maxFiles: z.number().int().min(1).max(30).optional(),
      accept: z.enum(['image', 'document', 'any']).optional(),
      multiple: z.boolean().optional(),
    })
    .nullish(),
  aiHint: z.string().max(1000).nullish(),
  i18n: translations,
});

export const stepSchema = z.object({
  id: z.string().optional(),
  key,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullish(),
  icon: z.string().max(60).nullish(),
  order: z.number().int().min(0),
  enabled: z.boolean().default(true),
  conditions: conditionSchema,
  i18n: translations,
  questions: z.array(questionSchema).max(60),
});

export const saveWorkflowSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().max(1000).nullish(),
    steps: z.array(stepSchema).max(40),
  })
  .superRefine((wf, ctx) => {
    const stepKeys = new Set<string>();
    const qKeys = new Set<string>();
    wf.steps.forEach((s, si) => {
      if (stepKeys.has(s.key)) ctx.addIssue({ code: 'custom', message: `Duplicate step key "${s.key}"`, path: ['steps', si, 'key'] });
      stepKeys.add(s.key);
      s.questions.forEach((q, qi) => {
        if (qKeys.has(q.key))
          ctx.addIssue({ code: 'custom', message: `Duplicate question key "${q.key}"`, path: ['steps', si, 'questions', qi, 'key'] });
        qKeys.add(q.key);
      });
    });
    const check = (cond: z.infer<typeof conditionSchema>, path: (string | number)[]) =>
      cond?.rules.forEach((r, ri) => {
        if (!qKeys.has(r.question))
          ctx.addIssue({ code: 'custom', message: `Condition references unknown question "${r.question}"`, path: [...path, 'rules', ri] });
      });
    wf.steps.forEach((s, si) => {
      check(s.conditions, ['steps', si, 'conditions']);
      s.questions.forEach((q, qi) => check(q.conditions, ['steps', si, 'questions', qi, 'conditions']));
    });
  });
export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(1000).optional(),
});

// ─── Projects ──────────────────────────────────────────────────────────────────
const answerValue = z.union([z.string().max(20000), z.array(z.string().max(2000)).max(100), z.null()]);

export const createProjectSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

export const saveAnswersSchema = z.object({
  answers: z.record(key, answerValue),
  currentStepKey: z.string().max(60).optional(),
  completedStepKey: z.string().max(60).optional(),
});
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  startDate: z.string().datetime().nullish(),
  dueDate: z.string().datetime().nullish(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(MEMBER_ROLES),
});

export const projectListQuery = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  clientId: z.string().optional(),
});

// ─── Files ─────────────────────────────────────────────────────────────────────
export const uploadMetaSchema = z.object({
  category: z.enum(FILE_CATEGORIES).default('ATTACHMENT'),
  visibility: z.enum(VISIBILITIES).default('CLIENT'),
  questionKey: key.optional(),
});

// ─── Messages ──────────────────────────────────────────────────────────────────
export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  kind: z.enum(MESSAGE_KINDS).exclude(['SYSTEM']).default('MESSAGE'),
});
export const moderateMessageSchema = z.object({
  action: z.enum(['approve', 'hide', 'unhide']),
});
export const updateThreadSchema = z.object({ locked: z.boolean() });

// ─── Tasks & notes ─────────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).default('TODO'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  assigneeId: z.string().nullish(),
  dueDate: z.string().datetime().nullish(),
});
export const updateTaskSchema = createTaskSchema
  .extend({
    estimateHours: z.number().int().min(0).max(2000).nullish(),
    /** Non-empty = blocked (with the reason); null clears the block. */
    blockedReason: z.string().trim().max(500).nullish(),
  })
  .partial();

/** Tickets a manager approved from an AI/requirements task plan. */
export const bulkCreateTasksSchema = z.object({
  reportId: z.string().min(1).optional(),
  tasks: z
    .array(
      createTaskSchema.extend({
        stepKey: z.string().max(60).nullish(),
        estimateHours: z.number().int().min(0).max(2000).nullish(),
      }),
    )
    .min(1)
    .max(60),
});
export const taskPlanSchema = z.object({
  reportId: z.string().min(1).optional(),
  locale: z.enum(['en', 'ar']).optional(),
});

export const createNoteSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  pinned: z.boolean().optional(),
});
export const updateNoteSchema = z.object({ pinned: z.boolean() });

// ─── Time off (leave & permissions) ───────────────────────────────────────────
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
export const createTimeOffSchema = z
  .object({
    type: z.enum(TIMEOFF_TYPES),
    leaveKind: z.enum(LEAVE_KINDS).optional(),
    startDate: isoDay,
    endDate: isoDay,
    startTime: clock.optional(),
    endTime: clock.optional(),
    reason: z.string().trim().max(1000).default(''),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date is before the start date' });
    if (v.type === 'PERMISSION') {
      if (v.endDate !== v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'A permission covers a single day' });
      if (!v.startTime || !v.endTime) ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start and end time are required' });
      else if (v.endTime <= v.startTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after the start time' });
    }
  });
export const assignTimeOffSchema = z.object({ approverId: z.string().min(1) });
export const decideTimeOffSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});

// ─── Proposals ─────────────────────────────────────────────────────────────────
export const paymentMilestoneSchema = z.object({
  label: z.string().trim().min(1).max(80),
  percent: z.number().min(1).max(100),
});
const paymentsSchema = z
  .array(paymentMilestoneSchema)
  .min(1)
  .max(6)
  .refine((p) => Math.abs(p.reduce((n, m) => n + m.percent, 0) - 100) < 0.01, 'Payment percentages must add up to 100');

const proposalTerms = {
  title: z.string().trim().max(200).optional(),
  currency: z.enum(CURRENCIES),
  amount: z.number().positive().max(1_000_000_000),
  taxPercent: z.number().min(0).max(100).default(0),
  durationWeeks: z.number().int().min(1).max(260).nullish(),
  validDays: z.number().int().min(1).max(180).default(14),
  payments: paymentsSchema,
};
export const createProposalSchema = z.object({
  ...proposalTerms,
  locale: z.enum(['en', 'ar']).default('en'),
  /** Private guidance for the AI writer (never shown to the client). */
  notes: z.string().trim().max(2000).optional(),
});
export const updateProposalSchema = z
  .object({
    ...proposalTerms,
    notes: z.string().trim().max(2000).nullish(),
    content: z.string().trim().min(20).max(60000),
    terms: z.string().trim().max(8000),
  })
  .partial();
export const regenerateProposalSchema = z.object({
  notes: z.string().trim().max(2000).nullish(),
  locale: z.enum(['en', 'ar']).optional(),
});
export const acceptProposalSchema = z.object({
  signerName: z.string().trim().min(2).max(80),
  agree: z.literal(true),
});
export const respondProposalSchema = z
  .object({ action: z.enum(['DECLINE', 'REQUEST_CHANGES']), note: z.string().trim().max(1000).default('') })
  .refine((v) => v.action === 'DECLINE' || v.note.length >= 3, { message: 'Tell us what you would like changed', path: ['note'] });

// ─── Wireframes ────────────────────────────────────────────────────────────────
export const generateWireframeSchema = z.object({
  locale: z.enum(['en', 'ar']).optional(),
  /** Private guidance for the AI (e.g. "focus on the booking flow"); never shown to the client. */
  notes: z.string().trim().max(2000).optional(),
});
export const respondWireframeSchema = z
  .object({ action: z.enum(['APPROVE', 'REQUEST_CHANGES']), note: z.string().trim().max(1000).default('') })
  .refine((v) => v.action === 'APPROVE' || v.note.length >= 3, { message: 'Tell us what you would like changed', path: ['note'] });

// ─── Notifications ─────────────────────────────────────────────────────────────
export const markReadSchema = z.object({ ids: z.array(z.string()).max(200).optional(), all: z.boolean().optional() });

// ─── AI ────────────────────────────────────────────────────────────────────────
export const aiChatSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  stepKey: z.string().max(60).optional(),
});
export const aiImproveSchema = z.object({
  projectId: z.string().min(1),
  questionKey: key,
  text: z.string().trim().min(3).max(5000),
});
export const technicalReportGenerateSchema = z.object({
  locale: z.enum(['en', 'ar']).optional(),
});
export const technicalReportShareSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});
export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().min(1).max(100),
  fallbackModels: z.string().trim().max(300).regex(/^[\w.,\s-]*$/, 'Comma-separated model ids'),
  apiKey: z.string().max(300).optional(), // empty string = keep existing, "__clear__" = remove
  persona: z.enum(AI_PERSONAS),
  systemPrompt: z.string().max(8000),
  temperature: z.number().min(0).max(2),
  maxOutputTokens: z.number().int().min(64).max(8192),
  dailyUserLimit: z.number().int().min(0).max(10000),
  monthlyTokenLimit: z.number().int().min(0).max(1_000_000_000),
  allowSuggest: z.boolean(),
  allowImprove: z.boolean(),
  allowExplain: z.boolean(),
});
export type AISettingsInput = z.infer<typeof aiSettingsSchema>;

// ─── Settings ──────────────────────────────────────────────────────────────────
export const contactInfoSchema = z.object({
  email: z.string().trim().max(120).default(''),
  phone: z.string().trim().max(50).default(''),
  whatsapp: z.string().trim().max(50).default(''),
  addressAr: z.string().trim().max(300).default(''),
  addressEn: z.string().trim().max(300).default(''),
  workingHoursAr: z.string().trim().max(150).default(''),
  workingHoursEn: z.string().trim().max(150).default(''),
  bioAr: z.string().trim().max(400).default(''),
  bioEn: z.string().trim().max(400).default(''),
  twitter: z.string().trim().max(250).default(''),
  linkedin: z.string().trim().max(250).default(''),
  instagram: z.string().trim().max(250).default(''),
  github: z.string().trim().max(250).default(''),
});
export type ContactInfo = z.infer<typeof contactInfoSchema>;

/** A logo/image reference: an https:// link or a site-relative /path (never javascript: or data: URLs). */
const assetUrl = z.union([z.literal(''), z.string().trim().max(500).regex(/^(https?:\/\/|\/)[^\s"'<>]+$/, 'Use an https:// link or a /path')]);

/** The product name shown across the site, dashboard, e-mails and the AI assistant. */
export const brandSchema = z.object({
  nameEn: z.string().trim().min(1).max(40).default('Welco'),
  nameAr: z.string().trim().min(1).max(40).default('ويلكو'),
  taglineEn: z.string().trim().max(120).default('Project Discovery'),
  taglineAr: z.string().trim().max(120).default('استكشاف المشاريع'),
  /** Replaces the built-in logo mark when set. */
  logoUrl: assetUrl.default(''),
  faviconUrl: assetUrl.default(''),
});
export type BrandSettings = z.infer<typeof brandSchema>;

/** Search-engine and social-sharing metadata for the public site. */
export const seoSchema = z.object({
  titleEn: z.string().trim().max(70).default(''),
  titleAr: z.string().trim().max(70).default(''),
  descriptionEn: z.string().trim().max(200).default(''),
  descriptionAr: z.string().trim().max(200).default(''),
  keywordsEn: z.string().trim().max(300).default(''),
  keywordsAr: z.string().trim().max(300).default(''),
  /** Public address of the site, used for canonical links, the sitemap and social cards. */
  siteUrl: z.union([z.literal(''), z.string().trim().max(200).regex(/^https?:\/\/[^\s"'<>]+$/, 'Use a full address such as https://example.com')]).default(''),
  ogImage: assetUrl.default(''),
  twitterHandle: z.union([z.literal(''), z.string().trim().regex(/^@?\w{1,15}$/, 'Use a handle such as @yourbrand')]).default(''),
  /** false → noindex everywhere and robots.txt disallows the whole site. */
  indexable: z.boolean().default(true),
});
export type SeoSettings = z.infer<typeof seoSchema>;

/** Defaults used when writing a proposal; the standard terms are copied into each proposal when it is drafted. */
export const proposalSettingsSchema = z.object({
  defaultCurrency: z.enum(CURRENCIES).default('USD'),
  defaultValidDays: z.number().int().min(1).max(180).default(14),
  defaultTaxPercent: z.number().min(0).max(100).default(0),
  termsEn: z.string().trim().max(8000).default(''),
  termsAr: z.string().trim().max(8000).default(''),
});
export type ProposalSettings = z.infer<typeof proposalSettingsSchema>;

export const platformSettingsSchema = z.object({
  developerClientMode: z.enum(DEV_CLIENT_MODES),
  emailNotifications: z.boolean(),
  allowClientRegistration: z.boolean(),
  contact: contactInfoSchema.default({}),
  brand: brandSchema.default({}),
  seo: seoSchema.default({}),
  proposal: proposalSettingsSchema.default({}),
});
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
