import http from 'node:http';
import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './core/prisma';
import { initRealtime } from './realtime/socket';
import { registerNotificationListeners } from './modules/notifications/notifications.service';

const app = createApp();
const server = http.createServer(app);
initRealtime(server);
registerNotificationListeners();

server.listen(env.PORT, () => {
  console.log(`◆ Welco API ready on http://localhost:${env.PORT}  (web: ${env.WEB_ORIGIN})`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
