import { registerRealtimeClient, unregisterRealtimeClient } from '../lib/realtime.js';

export function registerRealtimeStreamRoutes({ store }) {
  return async function handle(request, response) {
    if (request.url?.startsWith('/api/realtime') && request.method === 'GET') {
      const token = new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('token');
      const userId = token ? await store.getUserIdByToken(token) : null;

      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
      response.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      registerRealtimeClient(response, userId);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20000);
      request.on('close', () => { clearInterval(heartbeat); unregisterRealtimeClient(response, userId); });
      return true;
    }
    return false;
  };
}
