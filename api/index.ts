import type { IncomingMessage, ServerResponse } from 'node:http';

let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    const { createApp } = await import('../apps/api/src/app');
    const { registerNotificationListeners } = await import('../apps/api/src/modules/notifications/notifications.service');
    appInstance = createApp();
    registerNotificationListeners();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    // Ensure Express routes starting with /api match properly
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
    }
    const app = await getApp();
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
