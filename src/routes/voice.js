import { readRawBody, MAX_BODY_BYTES } from '../lib/http.js';

export function registerVoiceRoutes({ readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/realtime-call' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const sdp = (await readRawBody(request, MAX_BODY_BYTES)).toString();
      const result = await services.voice.realtimeCall(sdp);
      response.writeHead(result.status, { 'Content-Type': result.contentType, 'Access-Control-Allow-Origin': '*' });
      response.end(result.answer);
      return true;
    }
    if (request.url === '/api/motivation-audio' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const audio = await services.voice.motivationAudio(input);
      response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      response.end(audio);
      return true;
    }
    return false;
  };
}
