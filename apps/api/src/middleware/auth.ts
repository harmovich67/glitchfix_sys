import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { can, type Permission, type Role } from '@welco/shared';
import { env, isProd } from '../config/env';
import { prisma } from '../core/prisma';
import { getCachedUser, setCachedUser } from '../core/userCache';
import { forbidden, unauthorized } from '../core/errors';
import type { AuthUser } from '../types/express';

export const AUTH_COOKIE = 'welco_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

interface TokenPayload {
  sub: string;
  v: number;
}

export function signToken(userId: string, tokenVersion: number) {
  return jwt.sign({ sub: userId, v: tokenVersion } satisfies TokenPayload, env.APP_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: 'welco',
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
}

/** Resolve a user from a raw JWT (shared by HTTP and socket auth). */
export async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.APP_SECRET, { issuer: 'welco' }) as unknown as TokenPayload;
    let user = getCachedUser<Awaited<ReturnType<typeof prisma.user.findUnique>>>(payload.sub);
    if (!user) {
      user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) setCachedUser(payload.sub, user);
    }
    if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role as Role, locale: user.locale, financeAccess: user.financeAccess };
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid session cookie or Authorization header is present. Never rejects. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  req.user = (await userFromToken(token)) ?? undefined;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!permissions.every((p) => can(req.user!.role, p))) return next(forbidden());
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
