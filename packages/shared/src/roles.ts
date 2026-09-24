export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'];
export const MANAGER_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'];

export const PERMISSIONS = [
  'projects.view_all',
  'projects.manage', // status, priority, dates, approve / reopen
  'projects.assign',
  'projects.delete',
  'projects.work', // internal thread, notes, tasks, clarifications, previews (on accessible projects)
  'clients.view',
  'users.manage',
  'analytics.view',
  'messages.moderate',
  'workflows.manage',
  'ai.manage',
  'audit.view',
  'settings.manage',
  'timeoff.review_all', // see every time-off request and choose who approves it
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: [
    'projects.view_all',
    'projects.manage',
    'projects.assign',
    'projects.work',
    'clients.view',
    'users.manage',
    'analytics.view',
    'messages.moderate',
    'timeoff.review_all',
  ],
  PROJECT_MANAGER: [
    'projects.view_all',
    'projects.manage',
    'projects.assign',
    'projects.work',
    'clients.view',
    'analytics.view',
  ],
  DEVELOPER: ['projects.work'],
  CLIENT: [],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && role !== 'CLIENT';
}

/**
 * Prices, offers and the client's budget are visible to the Super Admin only, plus the staff members the
 * Super Admin explicitly granted `financeAccess` to. This is a per-person grant, not a role permission.
 */
export function hasFinanceAccess(user: { role?: Role | null; financeAccess?: boolean | null } | null | undefined): boolean {
  if (!user?.role) return false;
  return user.role === 'SUPER_ADMIN' || (isStaff(user.role) && !!user.financeAccess);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  DEVELOPER: 'Developer',
  CLIENT: 'Client',
};
