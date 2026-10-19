export const PROJECT_STATUSES = [
  'STARTED',
  'REQUIREMENTS',
  'UNDER_REVIEW',
  'DESIGN',
  'DEVELOPMENT',
  'TESTING',
  'COMPLETED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** NEW: a product built from the discovery journey. FIX: a repair request for the client's existing live site or app. */
export const PROJECT_KINDS = ['NEW', 'FIX'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/** What the client's existing site runs on (as far as they know). */
export const FIX_PLATFORMS = ['wordpress', 'woocommerce', 'shopify', 'wix', 'laravel', 'php', 'react', 'node', 'mobile_app', 'other', 'unknown'] as const;
export type FixPlatform = (typeof FIX_PLATFORMS)[number];

/** AI triage of a fix request. */
export const FIX_CATEGORIES = [
  'BUG', 'PERFORMANCE', 'SECURITY', 'HOSTING', 'EMAIL', 'PAYMENT', 'DESIGN', 'CONTENT', 'INTEGRATION', 'DATA', 'FEATURE', 'OTHER',
] as const;
export type FixCategory = (typeof FIX_CATEGORIES)[number];
export const FIX_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type FixSeverity = (typeof FIX_SEVERITIES)[number];

/** Statuses a client is still allowed to be in while filling the journey. */
export const DRAFT_STATUSES: ProjectStatus[] = ['STARTED', 'REQUIREMENTS'];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const MEMBER_ROLES = ['MANAGER', 'DEVELOPER'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const FILE_CATEGORIES = ['BRAND', 'REFERENCE', 'ATTACHMENT', 'SCREENSHOT', 'PREVIEW'] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const VISIBILITIES = ['CLIENT', 'INTERNAL'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const THREAD_TYPES = ['CLIENT', 'INTERNAL'] as const;
export type ThreadType = (typeof THREAD_TYPES)[number];

/**
 * FILE_REQUEST: the team asks the client for specific files; it links the client straight to the upload area and is
 * resolved when they upload. SYSTEM: posted by the platform (e.g. the receipt of those files, body = file names).
 */
export const MESSAGE_KINDS = ['MESSAGE', 'CLARIFICATION', 'FILE_REQUEST', 'SYSTEM'] as const;
/** Team requests the client can act on, each shown until resolved. */
export const REQUEST_KINDS: readonly MessageKind[] = ['CLARIFICATION', 'FILE_REQUEST'];
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_STATUSES = ['VISIBLE', 'PENDING', 'HIDDEN'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TIMEOFF_TYPES = ['LEAVE', 'PERMISSION'] as const;
export type TimeOffType = (typeof TIMEOFF_TYPES)[number];

export const LEAVE_KINDS = ['ANNUAL', 'SICK', 'UNPAID', 'OTHER'] as const;
export type LeaveKind = (typeof LEAVE_KINDS)[number];

export const TIMEOFF_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type TimeOffStatus = (typeof TIMEOFF_STATUSES)[number];

export const TASK_SOURCES = ['MANUAL', 'REQUIREMENT'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const STEP_PROGRESS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const;
export type StepProgress = (typeof STEP_PROGRESS)[number];

/** How developer → client messages are handled. */
export const DEV_CLIENT_MODES = ['direct', 'moderated', 'disabled'] as const;
export type DevClientMode = (typeof DEV_CLIENT_MODES)[number];

export const AI_PERSONAS = ['consultant', 'friendly', 'concise', 'technical'] as const;
export type AIPersona = (typeof AI_PERSONAS)[number];

export const AI_USAGE_KINDS = ['CHAT', 'IMPROVE', 'BRIEF', 'TECHNICAL_REPORT', 'TASK_PLAN', 'PROPOSAL', 'WIREFRAME', 'FIX_ANALYSIS', 'TEST'] as const;
export type AIUsageKind = (typeof AI_USAGE_KINDS)[number];

/** Requirement questions that hold the client's price or budget: hidden from staff without finance access. */
export const FINANCIAL_QUESTION_KEYS: readonly string[] = ['budget'];

export const UPLOAD_LIMITS = {
  maxBytes: 15 * 1024 * 1024,
  mime: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/postscript',
    'image/vnd.adobe.photoshop',
    'application/octet-stream',
  ],
  extensions: [
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pdf', '.zip', '.txt', '.csv',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.ai', '.eps', '.psd', '.fig', '.sketch',
  ],
} as const;
