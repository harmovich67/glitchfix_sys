import type { Request } from 'express';
import { unauthorized } from './errors';

export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : (v as string);
}

export function requestMeta(req: Request) {
  return { ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 300) ?? null };
}
