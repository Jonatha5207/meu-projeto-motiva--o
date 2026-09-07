export function registerCommunityRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/community/people' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.community.listPeople(user.id));
      return true;
    }
    if (request.url === '/api/connections' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.community.listConnections(user.id));
      return true;
    }
    if (request.url === '/api/connections' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const connection = await services.community.requestConnection(user.id, input.user_id);
      json(response, 201, connection);
      return true;
    }
    if (request.url?.startsWith('/api/connections/') && request.url.endsWith('/respond') && request.method === 'PATCH') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      const input = await readJsonBody(request);
      const connection = await services.community.respondToConnection(user.id, id, Boolean(input.accept));
      json(response, 200, connection);
      return true;
    }
    if (request.url?.match(/^\/api\/connections\/[^/]+\/messages$/) && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      json(response, 200, await services.community.listMessages(user.id, id));
      return true;
    }
    if (request.url?.match(/^\/api\/connections\/[^/]+\/messages$/) && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      const input = await readJsonBody(request);
      const message = await services.community.sendMessage(user.id, id, input);
      json(response, 201, message);
      return true;
    }
    return false;
  };
}
