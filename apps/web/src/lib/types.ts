import type {
  AnswerMap,
  MemberRole,
  MessageKind,
  MessageStatus,
  Priority,
  ProjectStatus,
  Role,
  TaskStatus,
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
  lastLoginAt: string | null;
  createdAt: string;
  clientProfile: ClientProfile | null;
  developerProfile: DeveloperProfile | null;
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
