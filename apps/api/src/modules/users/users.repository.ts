import { Prisma } from '@prisma/client';
import type { Role } from '@welco/shared';
import { prisma } from '../../core/prisma';

/** Never select passwordHash / tokenVersion outside the auth service. */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  locale: true,
  isActive: true,
  financeAccess: true,
  lastLoginAt: true,
  createdAt: true,
  clientProfile: true,
  developerProfile: true,
  phone: true,
  whatsapp: true,
  altEmail: true,
  emergencyName: true,
  emergencyPhone: true,
} satisfies Prisma.UserSelect;

/** Who a reviewer needs to reach the requester: name plus contact details. */
export const contactUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  whatsapp: true,
  altEmail: true,
  emergencyName: true,
  emergencyPhone: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const briefUserSelect = { id: true, name: true, email: true, role: true } satisfies Prisma.UserSelect;

export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id }, select: publicUserSelect }),
  findRawById: (id: string) => prisma.user.findUnique({ where: { id } }),

  list(filter: { roles?: Role[]; q?: string; active?: boolean }) {
    return prisma.user.findMany({
      where: {
        ...(filter.roles ? { role: { in: filter.roles } } : {}),
        ...(filter.active !== undefined ? { isActive: filter.active } : {}),
        ...(filter.q
          ? { OR: [{ name: { contains: filter.q } }, { email: { contains: filter.q } }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...publicUserSelect,
        _count: { select: { projects: true, memberships: true } },
      },
    });
  },

  byRoles: (roles: Role[]) =>
    prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: briefUserSelect }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data, select: publicUserSelect }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data, select: publicUserSelect }),
};
