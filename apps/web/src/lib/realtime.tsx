import { useEffect, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Notification } from './types';

let socket: Socket | null = null;
const joined = new Set<string>();

/** Connects once per signed-in session; turns server signals into cache invalidations. */
export function RealtimeBridge({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient();

  useEffect(() => {
    socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });
    socket.on('connect', () => joined.forEach((id) => socket?.emit('project:join', id)));
    socket.on('notification:new', (n: Notification) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast(n.title, { description: n.body ?? undefined });
    });
    socket.on('project:changed', ({ projectId, scope }: { projectId: string; scope: string }) => {
      if (scope === 'messages') qc.invalidateQueries({ queryKey: ['threads', projectId] });
      if (scope === 'files') qc.invalidateQueries({ queryKey: ['files', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['timeline', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['notes', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['moderation'] });
    });
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [userId, qc]);

  return <>{children}</>;
}

/** Subscribe the current page to a project's activity. */
export function useProjectRoom(projectId: string | undefined) {
  useEffect(() => {
    if (!projectId) return;
    joined.add(projectId);
    socket?.emit('project:join', projectId);
    return () => {
      joined.delete(projectId);
      socket?.emit('project:leave', projectId);
    };
  }, [projectId]);
}
