import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import type { LoginInput, RegisterInput } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { badRequest, conflict, forbidden, unauthorized } from '../../core/errors';
import { signToken } from '../../middleware/auth';
import { auditService } from '../audit/audit.service';
import { settingsService } from '../settings/settings.service';
import { publicUserSelect, usersRepository } from '../users/users.repository';

// Constant-time-ish failure path: compare against a dummy hash when the user does not exist.
const DUMMY_HASH = bcrypt.hashSync('welco-dummy-password', 10);

export const authService = {
  hash: (password: string) => bcrypt.hash(password, 11),

  async register(req: Request, input: RegisterInput) {
    const settings = await settingsService.get();
    if (!settings.allowClientRegistration) throw forbidden('Registration is currently closed');
    const email = input.email.trim().toLowerCase();
    if (await usersRepository.findByEmail(email)) throw conflict('An account with this email already exists');

    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await this.hash(input.password),
        role: 'CLIENT',
        locale: input.locale ?? 'en',
        clientProfile: { create: { companyName: input.companyName ?? '' } },
      },
      select: { ...publicUserSelect, tokenVersion: true },
    });
    await auditService.log(req, { action: 'auth.registered', entityType: 'User', entityId: user.id }, user.id);
    const { tokenVersion, ...publicUser } = user;
    return { user: publicUser, token: signToken(user.id, tokenVersion) };
  },

  async login(req: Request, input: LoginInput) {
    const user = await usersRepository.findByEmail(input.email);
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      await auditService.log(req, { action: 'auth.login_failed', entityType: 'User', entityId: user?.id, meta: { email: input.email } }, null);
      throw unauthorized('Invalid email or password');
    }
    if (!user.isActive) throw forbidden('This account has been deactivated');
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await auditService.log(req, { action: 'auth.login', entityType: 'User', entityId: user.id }, user.id);
    return { user: await usersRepository.findById(user.id), token: signToken(user.id, user.tokenVersion) };
  },

  async updateMe(
    req: Request,
    userId: string,
    input: { name?: string; locale?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await usersRepository.findRawById(userId);
    if (!user) throw unauthorized();
    let newToken: string | null = null;
    const data: { name?: string; locale?: string; passwordHash?: string; tokenVersion?: number } = {};
    if (input.name) data.name = input.name;
    if (input.locale) data.locale = input.locale;
    if (input.newPassword) {
      if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
        throw badRequest('Current password is incorrect');
      data.passwordHash = await this.hash(input.newPassword);
      data.tokenVersion = user.tokenVersion + 1; // sign out every other session
      newToken = signToken(user.id, data.tokenVersion);
      await auditService.log(req, { action: 'auth.password_changed', entityType: 'User', entityId: user.id });
    }
    const updated = await usersRepository.update(userId, data);
    return { user: updated, token: newToken };
  },

  async logoutEverywhere(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  },
};
