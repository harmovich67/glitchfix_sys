import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import type { LoginInput, RegisterInput } from '@welco/shared';
import { env } from '../../config/env';
import { prisma } from '../../core/prisma';
import { invalidateUser } from '../../core/userCache';
import { badRequest, conflict, forbidden, unauthorized } from '../../core/errors';
import { signToken } from '../../middleware/auth';
import { auditService } from '../audit/audit.service';
import { sendEmail } from '../notifications/email';
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
    input: {
      name?: string;
      locale?: string;
      currentPassword?: string;
      newPassword?: string;
      phone?: string;
      whatsapp?: string;
      altEmail?: string;
      emergencyName?: string;
      emergencyPhone?: string;
    },
  ) {
    const user = await usersRepository.findRawById(userId);
    if (!user) throw unauthorized();
    let newToken: string | null = null;
    const data: Prisma.UserUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.locale) data.locale = input.locale;
    // Contact details are staff-only; an empty string clears the field.
    if (user.role !== 'CLIENT')
      for (const k of ['phone', 'whatsapp', 'altEmail', 'emergencyName', 'emergencyPhone'] as const)
        if (input[k] !== undefined) data[k] = input[k] || null;
    if (input.newPassword) {
      if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
        throw badRequest('Current password is incorrect');
      data.passwordHash = await this.hash(input.newPassword);
      const nextVersion = user.tokenVersion + 1;
      data.tokenVersion = nextVersion; // sign out every other session
      newToken = signToken(user.id, nextVersion);
      await auditService.log(req, { action: 'auth.password_changed', entityType: 'User', entityId: user.id });
    }
    const updated = await usersRepository.update(userId, data);
    return { user: updated, token: newToken };
  },

  async logoutEverywhere(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    invalidateUser(userId);
  },

  async forgotPassword(req: Request, email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await usersRepository.findByEmail(normalized);
    if (!user || !user.isActive) {
      return { ok: true };
    }

    const token = jwt.sign(
      { sub: user.id, v: user.tokenVersion, type: 'reset' },
      env.APP_SECRET,
      { expiresIn: 3600 },
    );

    const resetPath = `/reset-password?token=${encodeURIComponent(token)}`;
    const fullResetUrl = `${env.WEB_ORIGIN}${resetPath}`;
    const brand = (await settingsService.get()).brand.nameEn;
    const isAr = user.locale === 'ar';

    const subject = isAr
      ? `طلب إعادة تعيين كلمة المرور - ${brand}`
      : `Password Reset Request - ${brand}`;

    const body = isAr
      ? `تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في ${brand}. انقر على الرابط التالي لتعيين كلمة مرور جديدة. هذا الرابط صالح لمدة ساعة واحدة فقط:`
      : `We received a request to reset your password at ${brand}. Click the link below to set a new password. This link is valid for 1 hour:`;

    sendEmail(
      [user.email],
      subject,
      body,
      resetPath,
      {
        'المستخدم / User': user.name,
        'البريد الإلكتروني / Email': user.email,
        'رابط التعيين / Reset URL': fullResetUrl,
        'مدة الصلاحية / Expiration': isAr ? 'ساعة واحدة' : '1 hour',
      },
    ).catch((err) => console.error('[authService.forgotPassword] Failed to send reset email:', err));

    await auditService.log(
      req,
      {
        action: 'auth.forgot_password_requested',
        entityType: 'User',
        entityId: user.id,
        meta: { email: user.email },
      },
      user.id,
    );

    return { ok: true };
  },

  async resetPassword(req: Request, token: string, newPassword: string) {
    let payload: { sub?: string; v?: number; type?: string };
    try {
      payload = jwt.verify(token, env.APP_SECRET) as typeof payload;
    } catch {
      throw badRequest('Invalid or expired password reset link');
    }

    if (payload.type !== 'reset' || !payload.sub || typeof payload.v !== 'number') {
      throw badRequest('Invalid reset token');
    }

    const user = await usersRepository.findRawById(payload.sub);
    if (!user) throw badRequest('User not found');
    if (!user.isActive) throw forbidden('This account has been deactivated');

    if (user.tokenVersion !== payload.v) {
      throw badRequest('This password reset link has already been used or expired');
    }

    const passwordHash = await this.hash(newPassword);
    const nextVersion = user.tokenVersion + 1;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: nextVersion,
      },
    });
    invalidateUser(user.id);

    await auditService.log(
      req,
      {
        action: 'auth.password_reset',
        entityType: 'User',
        entityId: user.id,
      },
      user.id,
    );

    return { ok: true };
  },
};
