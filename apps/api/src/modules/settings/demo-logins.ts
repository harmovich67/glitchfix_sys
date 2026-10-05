import bcrypt from 'bcryptjs';
import type { Role } from '@welco/shared';
import { prisma } from '../../core/prisma';
import { isProd } from '../../config/env';

/** The one-click accounts of the demo organisation (password below). */
const DEMO_EMAILS = ['superadmin@welco.dev', 'admin@welco.dev', 'pm@welco.dev', 'dev@welco.dev', 'client@welco.dev'];
const DEMO_PASSWORD = 'Welco123!';

export interface DemoLogin {
  email: string;
  role: Role;
}

let cache: { at: number; value: DemoLogin[] } | null = null;

/**
 * Demo accounts that can still be signed into with the demo password. An account drops out of the list as
 * soon as it is deleted, deactivated, renamed or given a real password — so the login page only ever offers
 * buttons that work and never advertises a secured account.
 */
export async function demoLogins(): Promise<DemoLogin[]> {
  if (isProd) return []; // never advertise demo accounts on a live deployment
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS }, isActive: true },
    select: { email: true, role: true, passwordHash: true },
  });
  const usable = await Promise.all(users.map(async (u) => ((await bcrypt.compare(DEMO_PASSWORD, u.passwordHash)) ? { email: u.email, role: u.role as Role } : null)));
  const value = DEMO_EMAILS.map((e) => usable.find((u) => u?.email === e)).filter((u): u is DemoLogin => !!u);
  cache = { at: Date.now(), value };
  return value;
}
