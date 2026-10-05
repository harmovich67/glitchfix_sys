import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app';
import { registerNotificationListeners } from '../apps/api/src/modules/notifications/notifications.service';

const app = createApp();
registerNotificationListeners();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
