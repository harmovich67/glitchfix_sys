import { EventEmitter } from 'node:events';
import type { ProjectStatus } from '@welco/shared';

/** Domain events. Services emit; notification / realtime / email listeners react. */
export interface DomainEvents {
  'project.created': { projectId: string; actorId: string };
  'project.submitted': { projectId: string; actorId: string };
  'project.statusChanged': { projectId: string; actorId: string; from: ProjectStatus; to: ProjectStatus };
  'project.assigned': { projectId: string; actorId: string; userId: string; role: string };
  'project.approved': { projectId: string; actorId: string };
  'project.reopened': { projectId: string; actorId: string };
  'project.updated': { projectId: string };
  'message.created': { messageId: string; projectId: string; threadType: string; actorId: string };
  'message.pending': { messageId: string; projectId: string; actorId: string };
  'message.approved': { messageId: string; projectId: string; actorId: string };
  'file.uploaded': { fileId: string; projectId: string; actorId: string; visibility: string; category: string };
  'task.assigned': { taskId: string; projectId: string; actorId: string; userId: string };
  'task.statusChanged': { taskId: string; projectId: string; actorId: string; from: string; to: string };
  'task.blocked': { taskId: string; projectId: string; actorId: string };
}

class TypedBus {
  private emitter = new EventEmitter();
  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]) {
    // Listeners run async so side effects never break the request that triggered them.
    setImmediate(() => this.emitter.emit(event, payload));
  }
  on<K extends keyof DomainEvents>(event: K, handler: (payload: DomainEvents[K]) => void | Promise<void>) {
    this.emitter.on(event, (p) => {
      Promise.resolve(handler(p)).catch((err) => console.error(`[event:${event}] listener failed`, err));
    });
  }
}

export const events = new TypedBus();
