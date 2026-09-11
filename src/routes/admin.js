import { unauthorized } from '../lib/errors.js';

export function registerAdminRoutes({ json, readJsonBody, isAdminAuthorized, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/admin/metrics' && request.method === 'GET') {
      if (!isAdminAuthorized(request)) throw unauthorized('admin_unauthorized');
      json(response, 200, await services.analytics.adminMetrics());
      return true;
    }
    if (request.url?.startsWith('/api/admin/events') && request.method === 'GET') {
      // Diagnostico do app nativo (Android) chega aqui mesmo sem login --
      // ver POST /api/events em notifications.js. "Visitante" (modo convidado)
      // nunca tem usuario, entao /api/events/mine (que exige login) nunca
      // mostrava nada pra quem testa sem conta -- essa rota admin ve tudo,
      // inclusive os eventos com user_id nulo.
      if (!isAdminAuthorized(request)) throw unauthorized('admin_unauthorized');
      const limit = new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('limit');
      json(response, 200, await services.analytics.recentEvents(limit ? Number(limit) : 100));
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
