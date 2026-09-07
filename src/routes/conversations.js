export function registerConversationRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/conversations' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.conversation.list(user.id));
      return true;
    }
    if (request.url === '/api/conversations' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const conversation = await services.conversation.create(user.id, input);
      json(response, 201, conversation);
      return true;
    }
    if (request.url?.match(/^\/api\/conversations\/[^/]+\/messages$/) && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      json(response, 200, await services.conversation.listMessages(user.id, id));
      return true;
    }
    if (request.url?.match(/^\/api\/conversations\/[^/]+\/messages$/) && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      const input = await readJsonBody(request);
      const message = await services.conversation.addMessage(user.id, id, input);
      json(response, 201, message);
      return true;
    }
    if (request.url === '/api/companion-chat' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      json(response, 200, await services.ai.respond(input));
      return true;
    }
    return false;
  };
}
