import { unauthorized } from '../lib/errors.js';

export function registerAdminRoutes({ json, readJsonBody, isAdminAuthorized, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/admin/metrics' && request.method === 'GET') {
      if (!isAdminAuthorized(request)) throw unauthorized('admin_unauthorized');
      json(response, 200, await services.analytics.adminMetrics());
      return true;
    }
    if (request.url?.startsWith('/api/admin/voice-consents/') && request.method === 'POST') {
      if (!isAdminAuthorized(request)) throw unauthorized('admin_unauthorized');
      const consentId = request.url.split('/').pop().split('?')[0];
      const input = await readJsonBody(request);
      const result = await services.voice.updateVoiceConsent(consentId, input);
      json(response, result.status, result.body);
      return true;
    }
    if (request.url?.startsWith('/api/admin/voice-consents') && request.method === 'GET') {
      if (!isAdminAuthorized(request)) throw unauthorized('admin_unauthorized');
      const limit = new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('limit');
      const result = await services.voice.listVoiceConsents(limit);
      json(response, result.status, result.body);
      return true;
    }
    return false;
  };
}
