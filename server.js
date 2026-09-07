import http from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile, describeEnv } from './src/lib/env.js';
import { logger } from './src/lib/logger.js';
import { sendJson, readJsonBody, cleanText } from './src/lib/http.js';
import { errorToResponse } from './src/lib/errors.js';
import { timingSafeEqualStrings } from './src/lib/crypto.js';
import { createStaticServer } from './src/lib/staticFiles.js';
import { broadcastRealtime } from './src/lib/realtime.js';
import { createStore } from './src/store/index.js';
import { createRouter } from './src/routes/router.js';

import { createAnalyticsService } from './src/services/analyticsService.js';
import { createAuthService } from './src/services/authService.js';
import { createProfileService } from './src/services/profileService.js';
import { createNotificationService } from './src/services/notificationService.js';
import { createSessionService } from './src/services/sessionService.js';
import { createObjectionService } from './src/services/objectionService.js';
import { createConversationService } from './src/services/conversationService.js';
import { createAiService } from './src/services/aiService.js';
import { createVoiceService } from './src/services/voiceService.js';
import { createSocialService } from './src/services/socialService.js';
import { createCommunityService } from './src/services/communityService.js';

process.on('uncaughtException', error => logger.error('uncaught_exception', error));
process.on('unhandledRejection', error => logger.error('unhandled_rejection', error));

const root = fileURLToPath(new URL('.', import.meta.url));
loadEnvFile(join(root, '.env'));
describeEnv(logger);

const publicDir = join(root, 'index.html');
const dataDir = join(root, '.data');
const port = Number(process.env.PORT || 8000);
const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token';

const store = await createStore({ dataDir, logger });

const analyticsService = createAnalyticsService({ store });
const authService = createAuthService({ store, analyticsService });
const profileService = createProfileService({ store, analyticsService });
const notificationService = createNotificationService({ store, analyticsService, logger });
const sessionService = createSessionService({ store, analyticsService, notificationService });
const objectionService = createObjectionService({ store, analyticsService });
const conversationService = createConversationService({ store, analyticsService });
const aiService = createAiService({ logger });
const voiceService = createVoiceService();
const socialService = createSocialService({ store, onFeedUpdated: post => broadcastRealtime('feed-updated', post) });
const communityService = createCommunityService({ store });

const services = {
  analytics: analyticsService,
  auth: authService,
  profile: profileService,
  notification: notificationService,
  session: sessionService,
  objection: objectionService,
  conversation: conversationService,
  ai: aiService,
  voice: voiceService,
  social: socialService,
  community: communityService,
};

function isAdminAuthorized(request) {
  return timingSafeEqualStrings(request.headers['x-admin-token'], adminToken);
}

async function requireUser(request, response) {
  const user = await authService.authenticate(request);
  if (!user) { sendJson(response, 401, { error: 'unauthorized' }); return null; }
  return user;
}

function json(response, status, body, extraHeaders = {}) {
  store.persist();
  sendJson(response, status, body, extraHeaders);
}

const route = createRouter({ json, readJsonBody, requireUser, isAdminAuthorized, services, store, cleanText });
const serveStatic = createStaticServer(publicDir);

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  try {
    if (request.url === '/api/health') {
      const health = { ok: true, service: 'companheiro-api', store: store.kind };
      if (store.kind === 'postgres') {
        try { await store.ping(); health.database = 'up'; } catch { health.ok = false; health.database = 'down'; }
      }
      return json(response, health.ok ? 200 : 503, health);
    }
    if (await route(request, response)) return;
    return serveStatic(request, response);
  } catch (error) {
    const { status, body, headers } = errorToResponse(error, logger);
    return json(response, status, body, headers);
  }
});

const schedulerHandle = setInterval(() => notificationService.runScheduler(), 60000);

server.listen(port, () => logger.info('server_started', { port, store: store.kind }));

async function shutdown(signal) {
  logger.info('shutdown_started', { signal });
  clearInterval(schedulerHandle);
  server.close(async () => {
    await store.close?.();
    logger.info('shutdown_complete');
    process.exit(0);
  });
  // Não deixa o processo pendurado se alguma conexão keep-alive não fechar sozinha.
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
