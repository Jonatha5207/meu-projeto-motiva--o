import { registerRealtimeClient, unregisterRealtimeClient } from '../lib/realtime.js';

export function registerRealtimeStreamRoutes() {
  return async function handle(request, response) {
    if (request.url?.startsWith('/api/realtime') && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
      response.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      registerRealtimeClient(response);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20000);
      request.on('close', () => { clearInterval(heartbeat); unregisterRealtimeClient(response); });
      return true;
    }
    return false;
  };
}
