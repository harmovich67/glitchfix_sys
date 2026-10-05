import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import { env } from '../config/env';
import { AUTH_COOKIE, userFromToken } from '../middleware/auth';
import { loadProjectAccess } from '../modules/projects/projects.access';
import type { AuthUser } from '../types/express';

let io: Server | null = null;

/**
 * Realtime channel. Rooms: `user:<id>` for personal notifications and `project:<id>` for
 * project activity. Project rooms only carry *invalidation signals* (never content), so the
 * browser re-fetches through the permission-checked REST API — internal data can't leak.
 */
export function initRealtime(server: HttpServer) {
  const allowedOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  io = new Server(server, {
    cors: {
      origin: allowedOrigins.includes('*') ? '*' : (allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
    const user = await userFromToken(cookies[AUTH_COOKIE]);
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    socket.join(`user:${user.id}`);

    socket.on('project:join', async (projectId: unknown) => {
      if (typeof projectId !== 'string') return;
      try {
        await loadProjectAccess(user, projectId);
        socket.join(`project:${projectId}`);
      } catch {
        /* no access: silently ignore */
      }
    });
    socket.on('project:leave', (projectId: unknown) => {
      if (typeof projectId === 'string') socket.leave(`project:${projectId}`);
    });
  });
  return io;
}

export const realtime = {
  toUser(userId: string, event: string, payload: unknown) {
    io?.to(`user:${userId}`).emit(event, payload);
  },
  projectChanged(projectId: string, scope: string) {
    io?.to(`project:${projectId}`).emit('project:changed', { projectId, scope });
  },
};
