export function registerObjectionRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/objections' && request.method === 'GET') {
      json(response, 200, await services.objection.listActive());
      return true;
    }
    if (request.url === '/api/objections' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const link = await services.objection.recordForUser(user.id, input);
      json(response, 201, link);
      return true;
    }
    return false;
  };
}
