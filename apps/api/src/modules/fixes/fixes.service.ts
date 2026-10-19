import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { CreateFixRequestInput, UpdateFixRequestInput, WorkflowDefinition } from '@welco/shared';
import { AppError, badRequest, forbidden } from '../../core/errors';
import { decryptSecret, encryptSecret } from '../../core/crypto';
import { events } from '../../core/events';
import { prisma } from '../../core/prisma';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { aiService } from '../ai/ai.service';
import { detectLocale } from '../ai/brief-store';
import { assertWork, loadProjectAccess } from '../projects/projects.access';
import { projectsRepository } from '../projects/projects.repository';
import { projectsService } from '../projects/projects.service';

/** Fix requests have no discovery journey. */
const NO_JOURNEY: WorkflowDefinition = { templateId: '', name: 'Fix request', version: 1, steps: [] };

const blankToNull = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);

async function loadFix(user: AuthUser, projectId: string) {
  const access = await loadProjectAccess(user, projectId);
  const fix = await prisma.fixRequest.findUnique({ where: { projectId } });
  if (!fix) throw badRequest('This project is not a fix request');
  return { access, fix };
}

export const fixesService = {
  /** A client reports a problem on their existing site. It goes straight to review, with an AI triage for the team. */
  async create(req: Request, user: AuthUser, input: CreateFixRequestInput) {
    if (user.role !== 'CLIENT') throw forbidden('Fix requests are sent by clients');
    const secrets = !!(input.password || input.extraAccess?.trim());
    let project;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        project = await prisma.project.create({
          data: {
            code: await projectsRepository.nextCode(attempt),
            title: input.title,
            clientId: user.id,
            kind: 'FIX',
            projectType: 'fix',
            workflowSnapshot: NO_JOURNEY as unknown as Prisma.InputJsonValue,
            status: 'UNDER_REVIEW',
            priority: input.urgency,
            progress: 100,
            submittedAt: new Date(),
            threads: { create: [{ type: 'CLIENT' }, { type: 'INTERNAL' }] },
            fixRequest: {
              create: {
                siteUrl: input.siteUrl,
                platform: input.platform ?? null,
                loginUrl: blankToNull(input.loginUrl) ?? null,
                username: blankToNull(input.username) ?? null,
                passwordEnc: input.password ? encryptSecret(input.password) : null,
                extraAccessEnc: input.extraAccess?.trim() ? encryptSecret(input.extraAccess.trim()) : null,
                problem: input.problem,
                history: blankToNull(input.history) ?? null,
                urgency: input.urgency,
                consentAt: secrets ? new Date() : null,
              },
            },
          },
        });
        break;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    if (!project) throw new AppError(500, 'CODE_COLLISION', 'Could not allocate a project code, please retry');

    await projectsRepository.addEvent(project.id, {
      type: 'submitted',
      title: 'Fix request sent',
      body: 'The team will look into the problem and get back to you shortly.',
      actorId: user.id,
    });
    await auditService.log(req, { action: 'fix.created', entityType: 'Project', entityId: project.id, meta: { siteUrl: input.siteUrl, withAccess: secrets } });

    // Triage now so the team opens the request with the analysis ready. Never block the client on it.
    let analyzed = false;
    try {
      analyzed = !!(await aiService.analyzeFix(req, user, project.id, detectLocale(`${input.problem} ${input.history ?? ''}`), { auto: true }));
    } catch (err) {
      console.warn(`[fix] automatic analysis skipped for ${project.code}: ${(err as Error).message}`);
    }

    events.emit('project.created', { projectId: project.id, actorId: user.id });
    events.emit('project.submitted', { projectId: project.id, actorId: user.id });
    return { id: project.id, code: project.code, analyzed };
  },

  /** The client (until the request is approved) or a manager corrects the details. Empty secrets keep the stored ones. */
  async update(req: Request, user: AuthUser, projectId: string, input: UpdateFixRequestInput) {
    const { access, fix } = await loadFix(user, projectId);
    if (!access.canEditAnswers) throw forbidden(access.project.approvedAt ? 'The request is approved and locked' : 'You cannot edit this request');
    const newSecrets = !!(input.password || input.extraAccess?.trim());
    const described = (input.problem !== undefined && input.problem !== fix.problem) || (input.history !== undefined && (blankToNull(input.history) ?? null) !== fix.history);

    const data: Prisma.FixRequestUpdateInput = {
      siteUrl: input.siteUrl,
      platform: input.platform,
      loginUrl: blankToNull(input.loginUrl),
      username: blankToNull(input.username),
      problem: input.problem,
      history: blankToNull(input.history),
      urgency: input.urgency,
      ...(input.password ? { passwordEnc: encryptSecret(input.password) } : {}),
      ...(input.extraAccess?.trim() ? { extraAccessEnc: encryptSecret(input.extraAccess.trim()) } : {}),
      ...(newSecrets ? { consentAt: new Date(), credentialsClearedAt: null } : {}),
      ...(described ? { editedAt: new Date() } : {}),
    };
    await prisma.fixRequest.update({ where: { id: fix.id }, data });
    if (input.title && input.title !== access.project.title) await projectsRepository.update(projectId, { title: input.title });

    await projectsRepository.addEvent(projectId, {
      type: 'requirements_updated',
      title: 'Fix request updated',
      body: `${user.name} changed the details${newSecrets ? ' and the access' : ''}`,
      actorId: user.id,
      visibility: 'INTERNAL',
    });
    await auditService.log(req, {
      action: 'fix.updated',
      entityType: 'Project',
      entityId: projectId,
      // Never log secret values, only which fields changed.
      meta: { fields: Object.keys(input).filter((k) => !['password', 'extraAccess', 'consent'].includes(k)), newSecrets },
    });
    events.emit('project.updated', { projectId });
    return projectsService.get(user, projectId);
  },

  /** Decrypt the access for a team member working on the project. Every view is audited. */
  async revealCredentials(req: Request, user: AuthUser, projectId: string) {
    const { access, fix } = await loadFix(user, projectId);
    assertWork(access);
    await auditService.log(req, { action: 'fix.credentials_viewed', entityType: 'Project', entityId: projectId });
    await projectsRepository.addEvent(projectId, {
      type: 'credentials_viewed',
      title: `${user.name} opened the site access details`,
      actorId: user.id,
      visibility: 'INTERNAL',
    });
    return {
      loginUrl: fix.loginUrl,
      username: fix.username,
      password: decryptSecret(fix.passwordEnc),
      extraAccess: decryptSecret(fix.extraAccessEnc),
    };
  },

  /** Remove the password and server access (the client changed them, or the job is done). */
  async clearCredentials(req: Request, user: AuthUser, projectId: string) {
    const { access, fix } = await loadFix(user, projectId);
    if (!access.isOwner && !access.canWork) throw forbidden();
    await prisma.fixRequest.update({ where: { id: fix.id }, data: { passwordEnc: null, extraAccessEnc: null, credentialsClearedAt: new Date() } });
    await projectsRepository.addEvent(projectId, { type: 'credentials_cleared', title: 'Site access details removed', actorId: user.id });
    await auditService.log(req, { action: 'fix.credentials_cleared', entityType: 'Project', entityId: projectId });
    events.emit('project.updated', { projectId });
    return projectsService.get(user, projectId);
  },
};
