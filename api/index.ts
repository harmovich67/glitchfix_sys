import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app';
import { registerNotificationListeners } from '../apps/api/src/modules/notifications/notifications.service';

const app = createApp();
registerNotificationListeners();

export default function handler(req: any, res: any) {
  try {
    // Ensure Express routes starting with /api match properly
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API Handler Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'SERVER_ERROR',
      message: err.message || 'Internal server error',
    }));
  }
}
