export function registerSessionRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/sessions' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.session.list(user.id));
      return true;
    }
    if (request.url === '/api/sessions' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const session = await services.session.create(user.id, input);
      json(response, 201, session);
      return true;
    }
    if (request.url?.startsWith('/api/sessions/') && request.method === 'PATCH') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/').pop();
      const input = await readJsonBody(request);
      const session = await services.session.update(user.id, id, input);
      json(response, 200, session);
      return true;
    }
    if (request.url === '/api/feedback' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const feedback = await services.session.submitFeedback(user.id, input);
      json(response, 201, feedback);
      return true;
    }
    return false;
  };
}
