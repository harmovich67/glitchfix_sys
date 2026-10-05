import { createApp } from './app';
import { registerNotificationListeners } from './modules/notifications/notifications.service';

let app: any = null;
function getApp() {
  if (!app) {
    app = createApp();
    registerNotificationListeners();
  }
  return app;
}

export default function handler(req: any, res: any) {
  try {
    if (req.url === '/api/ping') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, node: process.version }));
    }

    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
    }
    const a = getApp();
    return a(req, res);
  } catch (err: any) {
    console.error('Vercel API Handler Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      stack: err.stack,
    }));
  }
}
