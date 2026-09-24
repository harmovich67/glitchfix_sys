import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { STAFF_ROLES, type Role, createUserSchema, updateClientSchema, updateUserSchema } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors';
import type { AuthUser } from '../../types/express';
import { auditService } from '../audit/audit.service';
import { authService } from '../auth/auth.service';
import { briefUserSelect, publicUserSelect, usersRepository } from './users.repository';

type CreateUser = z.infer<typeof createUserSchema>;
type UpdateUser = z.infer<typeof updateUserSchema>;

function assertCanManage(actor: AuthUser, targetRole: Role) {
  if (actor.role !== 'SUPER_ADMIN' && targetRole === 'SUPER_ADMIN') throw forbidden('Only a Super Admin can manage Super Admins');
}

export const usersService = {
  listTeam: (q?: string) => usersRepository.list({ roles: STAFF_ROLES, q }),

  /** Staff that can be assigned to projects, with their current workload. */
  async assignable() {
    const users = await prisma.user.findMany({
      where: { role: { in: ['PROJECT_MANAGER', 'DEVELOPER', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: {
        ...briefUserSelect,
        developerProfile: { select: { title: true, skills: true, capacity: true } },
        memberships: { where: { project: { status: { not: 'COMPLETED' } } }, select: { projectId: true } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map(({ memberships, ...u }) => ({ ...u, activeProjects: memberships.length }));
  },

  async create(req: Request, actor: AuthUser, input: CreateUser) {
    assertCanManage(actor, input.role);
    if (await usersRepository.findByEmail(input.email)) throw conflict('An account with this email already exists');
    const user = await usersRepository.create({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await authService.hash(input.password),
      ...(input.role === 'CLIENT'
        ? { clientProfile: { create: {} } }
        : input.role === 'DEVELOPER'
          ? { developerProfile: { create: { title: input.title, skills: input.skills ?? [] } } }
          : {}),
    });
    await auditService.log(req, { action: 'user.created', entityType: 'User', entityId: user.id, meta: { role: input.role } });
    return user;
  },

  async update(req: Request, actor: AuthUser, id: string, input: UpdateUser) {
    const target = await usersRepository.findRawById(id);
    if (!target) throw notFound('User');
    assertCanManage(actor, target.role as Role);
    if (input.role) assertCanManage(actor, input.role);
    if (id === actor.id && (input.isActive === false || (input.role && input.role !== actor.role)))
      throw badRequest('You cannot deactivate yourself or change your own role');

    const data: Prisma.UserUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.role) data.role = input.role;
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
      if (!input.isActive) data.tokenVersion = { increment: 1 }; // kill sessions
    }
    const becomesDev = (input.role ?? target.role) === 'DEVELOPER';
    if (becomesDev && (input.title !== undefined || input.skills || input.capacity !== undefined || input.role)) {
      data.developerProfile = {
        upsert: {
          create: { title: input.title, skills: input.skills ?? [], capacity: input.capacity ?? 3 },
          update: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.skills ? { skills: input.skills } : {}),
            ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          },
        },
      };
    }
    const user = await usersRepository.update(id, data);
    await auditService.log(req, { action: 'user.updated', entityType: 'User', entityId: id, meta: input as Record<string, unknown> });
    return user;
  },

  // ── Clients ────────────────────────────────────────────────────────────────
  async listClients(q?: string) {
    const clients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        ...(q
          ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { clientProfile: { companyName: { contains: q } } }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...publicUserSelect,
        projects: { select: { id: true, status: true, updatedAt: true, projectType: true }, orderBy: { updatedAt: 'desc' } },
      },
    });
    return clients.map(({ projects, ...c }) => ({
      ...c,
      projectCount: projects.length,
      activeCount: projects.filter((p) => p.status !== 'COMPLETED').length,
      lastActivityAt: projects[0]?.updatedAt ?? c.createdAt,
      projectTypes: [...new Set(projects.map((p) => p.projectType).filter(Boolean))],
    }));
  },

  async getClient(id: string) {
    const client = await prisma.user.findFirst({
      where: { id, role: 'CLIENT' },
      select: {
        ...publicUserSelect,
        projects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, code: true, title: true, status: true, priority: true, projectType: true,
            progress: true, createdAt: true, submittedAt: true, dueDate: true,
          },
        },
      },
    });
    if (!client) throw notFound('Client');
    const [messages, files] = await Promise.all([
      prisma.message.count({ where: { authorId: id } }),
      prisma.file.count({ where: { uploaderId: id } }),
    ]);
    return { ...client, stats: { messages, files } };
  },

  async updateClient(req: Request, id: string, input: z.infer<typeof updateClientSchema>) {
    const client = await prisma.user.findFirst({ where: { id, role: 'CLIENT' } });
    if (!client) throw notFound('Client');
    await prisma.clientProfile.upsert({ where: { userId: id }, create: { userId: id, ...input }, update: input });
    await auditService.log(req, { action: 'client.updated', entityType: 'User', entityId: id });
    return this.getClient(id);
  },
};
