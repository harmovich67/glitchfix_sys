import { can, hasFinanceAccess } from '@welco/shared';
import { forbidden, notFound } from '../../core/errors';
import type { AuthUser } from '../../types/express';
import { projectsRepository } from './projects.repository';

export type ProjectAccess = Awaited<ReturnType<typeof loadProjectAccess>>;

/**
 * Resource-level authorization for a project. Every service touching project data goes through
 * here so the rules live in one place:
 *   client → own projects · developer → projects they are a member of · managers → all.
 */
export async function loadProjectAccess(user: AuthUser, projectId: string) {
  const project = await projectsRepository.findBasic(projectId);
  if (!project) throw notFound('Project');

  const isOwner = project.clientId === user.id;
  const isMember = project.members.some((m) => m.userId === user.id);
  const viewAll = can(user.role, 'projects.view_all');
  if (!isOwner && !isMember && !viewAll) throw notFound('Project'); // don't reveal existence

  const isClient = user.role === 'CLIENT';
  const staffOnProject = !isClient && (isMember || viewAll);

  return {
    project,
    isOwner,
    isMember,
    isClient,
    /** Can see the internal thread, notes, tasks, internal files. */
    canWork: staffOnProject && can(user.role, 'projects.work'),
    canManage: can(user.role, 'projects.manage'),
    canAssign: can(user.role, 'projects.assign'),
    canModerate: can(user.role, 'messages.moderate'),
    /** Prices, offers and the client's budget: Super Admin, or staff the Super Admin granted it to. */
    canViewFinance: hasFinanceAccess(user),
    /** Client owner (or a manager) can edit answers until requirements are approved. */
    canEditAnswers: !project.approvedAt && (isOwner || can(user.role, 'projects.manage')),
  };
}

export function assertWork(access: ProjectAccess) {
  if (!access.canWork) throw forbidden();
}

export function assertManage(access: ProjectAccess) {
  if (!access.canManage) throw forbidden();
}

export function assertFinance(access: ProjectAccess) {
  if (!access.canViewFinance) throw forbidden();
}
