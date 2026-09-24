import type {
  AnswerMap,
  MemberRole,
  MessageKind,
  MessageStatus,
  Priority,
  ProjectStatus,
  Role,
  TaskStatus,
  WireframeSpec,
  WireframeStatus,
  WorkflowDefinition,
  WorkflowStep,
} from '@welco/shared';

export interface BriefUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ClientProfile {
  companyName: string;
  industry?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  internalNotes?: string | null;
}

export interface DeveloperProfile {
  title?: string | null;
  skills: string[];
  capacity: number;
}

export interface User extends BriefUser {
  locale: 'en' | 'ar';
  isActive: boolean;
  /** Staff only: may see prices, offers and the client's budget. */
  financeAccess?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  clientProfile: ClientProfile | null;
  developerProfile: DeveloperProfile | null;
  phone?: string | null;
  whatsapp?: string | null;
  altEmail?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
}

export interface Member {
  id: string;
  role: MemberRole;
  assignedAt: string;
  user: BriefUser & { developerProfile?: { title?: string | null; skills: string[] } | null };
}

export interface ProjectListItem {
  id: string;
  code: string;
  title: string;
  status: ProjectStatus;
  priority: Priority;
  projectType: string | null;
  progress: number;
  currentStepKey: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: BriefUser & { clientProfile: { companyName: string } | null };
  members: Member[];
  _count: { files: number; tasks: number };
}

export interface AIBrief {
  text: string;
  generatedAt: string;
  model?: string;
  mock?: boolean;
}

export interface ProjectAccess {
  canEditAnswers: boolean;
  canWork: boolean;
  canManage: boolean;
  canAssign: boolean;
  canModerate: boolean;
  canViewFinance: boolean;
  isOwner: boolean;
}

export interface ProjectDetail extends Omit<ProjectListItem, '_count' | 'client'> {
  startDate: string | null;
  aiBriefs: Partial<Record<'en' | 'ar', AIBrief>> | null;
  workflow: WorkflowDefinition;
  answers: AnswerMap;
  access: ProjectAccess;
  steps: { stepKey: string; status: string; completedAt: string | null }[];
  template: { id: string; name: string; version: number } | null;
  client: BriefUser & { locale: string; createdAt: string; clientProfile: ClientProfile | null };
}

export interface ProjectEvent {
  id: string;
  type: string;
  title: string;
  body: string | null;
  visibility: 'CLIENT' | 'INTERNAL';
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: BriefUser | null;
}

export interface FileItem {
  id: string;
  projectId: string;
  questionKey: string | null;
  category: string;
  visibility: 'CLIENT' | 'INTERNAL';
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: BriefUser;
}

export interface Message {
  id: string;
  threadId: string;
  kind: MessageKind;
  body: string;
  status: MessageStatus;
  resolvedAt: string | null;
  createdAt: string;
  author: BriefUser | null;
  moderatedBy: { id: string; name: string } | null;
  moderatedAt: string | null;
}

export interface Thread {
  id: string;
  projectId: string;
  type: 'CLIENT' | 'INTERNAL';
  locked: boolean;
  messages: Message[];
}

export interface ThreadsResponse {
  threads: Thread[];
  developerClientMode: 'direct' | 'moderated' | 'disabled';
  canModerate: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  assignee: BriefUser | null;
  createdBy: BriefUser;
  project?: { id: string; code: string; title: string };
  /** Per-project ticket number; 0 for tasks created before numbering. */
  number: number;
  source: 'MANUAL' | 'REQUIREMENT';
  /** Requirement group (journey step) the ticket traces back to. */
  stepKey: string | null;
  reportId: string | null;
  estimateHours: number | null;
  blockedReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedTicket {
  title: string;
  description: string;
  priority: Priority;
  stepKey: string | null;
  estimateHours: number | null;
  duplicate: boolean;
}

export interface TechnicalReportShare {
  id: string;
  sharedAt: string;
  recipient: BriefUser;
  sharedBy: BriefUser;
}

export interface TechnicalReport {
  id: string;
  projectId: string;
  version: number;
  locale: 'en' | 'ar';
  model: string | null;
  mock: boolean;
  requirementsUpdatedAt: string;
  answerCount: number;
  createdAt: string;
  createdBy: BriefUser;
  shares: TechnicalReportShare[];
  sharedWithMe: boolean;
  /** The client's requirements changed after this version was written. */
  stale: boolean;
  content?: string;
}

export interface TechnicalReportsResponse {
  canGenerate: boolean;
  canShare: boolean;
  current: { requirementsUpdatedAt: string; answerCount: number };
  reports: TechnicalReport[];
}

export interface TechnicalReportDetail extends TechnicalReport {
  content: string;
  canManage: boolean;
  project: { id: string; code: string; title: string };
}

export interface SharedReportItem {
  shareId: string;
  sharedAt: string;
  sharedBy: BriefUser;
  report: Omit<TechnicalReport, 'shares' | 'sharedWithMe' | 'stale'> & { project: { id: string; code: string; title: string } };
}

export interface Note {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: BriefUser;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AIStatus {
  enabled: boolean;
  mode: 'live' | 'demo';
  features: { suggest: boolean; improve: boolean; explain: boolean };
  remainingToday: number | null;
}

export interface AISuggestion {
  questionKey: string;
  values: string[];
  reason?: string;
}

export interface AIChatResult {
  reply: string;
  suggestions: AISuggestion[];
  followUps: string[];
  mock: boolean;
}

export interface AIMessageRow {
  id: string;
  role: 'USER' | 'MODEL';
  content: string;
  meta: { suggestions?: AISuggestion[]; followUps?: string[]; mock?: boolean } | null;
  createdAt: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  version: number;
  updatedAt: string;
  stepCount: number;
  enabledSteps: number;
  questionCount: number;
  projectCount: number;
}

export interface WorkflowFull extends WorkflowDefinition {
  id: string;
  description: string | null;
  isDefault: boolean;
  updatedAt: string;
  steps: WorkflowStep[];
}

export interface AssignableUser extends BriefUser {
  developerProfile: { title?: string | null; skills: string[]; capacity: number } | null;
  activeProjects: number;
}

export type ContactUser = BriefUser & {
  phone: string | null;
  whatsapp: string | null;
  altEmail: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
};

export interface TimeOffRequest {
  id: string;
  userId: string;
  type: 'LEAVE' | 'PERMISSION';
  leaveKind: 'ANNUAL' | 'SICK' | 'UNPAID' | 'OTHER' | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approver: BriefUser | null;
  assignedBy: BriefUser | null;
  assignedAt: string | null;
  decidedBy: BriefUser | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  user: ContactUser;
}

export interface TimeOffSummary {
  mine: number;
  review: number;
  unassigned: number;
  canReview: boolean;
}

export interface AwayItem {
  id: string;
  startDate: string;
  endDate: string;
  leaveKind: TimeOffRequest['leaveKind'];
  user: BriefUser;
}

export interface ProposalTotals {
  subtotal: number;
  tax: number;
  total: number;
  schedule: { label: string; percent: number; amount: number }[];
}

export interface ProposalItem {
  id: string;
  projectId: string;
  version: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'REVISION_REQUESTED' | 'WITHDRAWN' | 'SUPERSEDED';
  locale: 'en' | 'ar';
  title: string;
  currency: string;
  amount: number;
  taxPercent: number;
  durationWeeks: number | null;
  validDays: number;
  validUntil: string | null;
  payments: { label: string; percent: number }[];
  totals: ProposalTotals;
  terms: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  responseNote: string | null;
  acceptedByName: string | null;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
  /** Manager-only. */
  notes?: string | null;
  model?: string | null;
  mock?: boolean;
  createdBy?: BriefUser | null;
}

export interface ProposalDetail extends ProposalItem {
  content: string;
  project: { id: string; code: string; title: string };
}

export interface ProposalsResponse {
  canManage: boolean;
  submitted: boolean;
  hasAccepted: boolean;
  defaults: { currency: string; validDays: number; taxPercent: number } | null;
  proposals: ProposalItem[];
}

export interface PendingProposals {
  audience: 'client' | 'manager' | 'none';
  items: (ProposalItem & { project: { id: string; code: string; title: string } })[];
}

export interface WireframeItem {
  id: string;
  projectId: string;
  version: number;
  status: WireframeStatus;
  locale: 'en' | 'ar';
  title: string;
  spec: WireframeSpec;
  sharedAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  responseNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Team-only. */
  notes?: string | null;
  model?: string | null;
  mock?: boolean;
  createdBy?: BriefUser | null;
}

export interface WireframesResponse {
  canManage: boolean;
  submitted: boolean;
  wireframes: WireframeItem[];
}
