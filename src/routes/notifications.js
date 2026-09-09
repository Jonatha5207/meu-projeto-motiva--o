import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { badRequest } from '../lib/errors.js';

export function registerNotificationRoutes({ json, readJsonBody, requireUser, services, store }) {
  return async function handle(request, response) {
    if (request.url === '/api/push/public-key' && request.method === 'GET') {
      json(response, 200, { publicKey: services.notification.vapidPublicKey() });
      return true;
    }
    if (request.url === '/api/notifications' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.notification.listForUser(user.id));
      return true;
    }
    if (request.url === '/api/devices' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const token = cleanText(input.device_token, 2000);
      const platform = cleanText(input.platform, 20).toUpperCase();
      if (!token || !['ANDROID', 'IOS', 'WEB'].includes(platform)) throw badRequest('invalid_device');
      const device = { id: randomUUID(), user_id: user.id, device_token: token, platform, active: true, updated_at: new Date().toISOString() };
      await store.upsertDeviceToken(device);
      json(response, 201, device);
      return true;
    }
    if (request.url === '/api/events' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      await services.analytics.recordFromClient(user.id, input);
      json(response, 201, { ok: true });
      return true;
    }
    if (request.url?.startsWith('/api/events/mine') && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.analytics.recentEventsForUser(user.id, 50));
      return true;
    }
    return false;
  };
}
