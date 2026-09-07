export function registerAuthRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/auth/register' && request.method === 'POST') {
      const input = await readJsonBody(request);
      const result = await services.auth.register(input);
      json(response, 201, result);
      return true;
    }
    if (request.url === '/api/auth/login' && request.method === 'POST') {
      const input = await readJsonBody(request);
      const result = await services.auth.login(input);
      json(response, 200, result);
      return true;
    }
    if (request.url === '/api/me' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.auth.me(user));
      return true;
    }
    if (request.url === '/api/me' && request.method === 'DELETE') {
      const user = await requireUser(request, response); if (!user) return true;
      await services.auth.deleteAccount(user.id);
      json(response, 204, {});
      return true;
    }
    return false;
  };
}
