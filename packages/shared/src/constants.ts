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

export const MESSAGE_KINDS = ['MESSAGE', 'CLARIFICATION', 'SYSTEM'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_STATUSES = ['VISIBLE', 'PENDING', 'HIDDEN'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STEP_PROGRESS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const;
export type StepProgress = (typeof STEP_PROGRESS)[number];

/** How developer → client messages are handled. */
export const DEV_CLIENT_MODES = ['direct', 'moderated', 'disabled'] as const;
export type DevClientMode = (typeof DEV_CLIENT_MODES)[number];

export const AI_PERSONAS = ['consultant', 'friendly', 'concise', 'technical'] as const;
export type AIPersona = (typeof AI_PERSONAS)[number];

export const AI_USAGE_KINDS = ['CHAT', 'IMPROVE', 'BRIEF', 'TEST'] as const;
export type AIUsageKind = (typeof AI_USAGE_KINDS)[number];

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
