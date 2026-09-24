import type { Priority, ProjectStatus, TaskStatus } from '@welco/shared';

export const STATUS_STYLE: Record<ProjectStatus, { dot: string; badge: string }> = {
  STARTED: { dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/20' },
  REQUIREMENTS: { dot: 'bg-sky-500', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20' },
  UNDER_REVIEW: { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/25' },
  DESIGN: { dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/20' },
  DEVELOPMENT: { dot: 'bg-indigo-500', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20' },
  TESTING: { dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-cyan-500/20' },
  COMPLETED: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20' },
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: 'text-slate-500 bg-slate-500/10 ring-slate-500/15',
  MEDIUM: 'text-sky-600 dark:text-sky-300 bg-sky-500/10 ring-sky-500/15',
  HIGH: 'text-amber-600 dark:text-amber-300 bg-amber-500/10 ring-amber-500/20',
  URGENT: 'text-rose-600 dark:text-rose-300 bg-rose-500/10 ring-rose-500/25',
};

export const TASK_STYLE: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-indigo-500',
  REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
};

/** Accent gradients for project-type tiles. */
export const TYPE_GRADIENT: Record<string, string> = {
  ecommerce: 'from-violet-500 to-fuchsia-500',
  company_website: 'from-sky-500 to-indigo-500',
  mobile_app: 'from-emerald-500 to-cyan-500',
  saas: 'from-indigo-500 to-violet-600',
  booking: 'from-amber-500 to-orange-500',
  real_estate: 'from-teal-500 to-emerald-600',
  landing_page: 'from-rose-500 to-pink-500',
  custom: 'from-slate-600 to-slate-800',
  other: 'from-fuchsia-500 to-cyan-500',
};

export const TYPE_ICON: Record<string, string> = {
  ecommerce: 'ShoppingBag',
  company_website: 'Building2',
  mobile_app: 'Smartphone',
  saas: 'Layers',
  booking: 'CalendarCheck',
  real_estate: 'Home',
  landing_page: 'Rocket',
  custom: 'Code2',
  other: 'Sparkles',
};
