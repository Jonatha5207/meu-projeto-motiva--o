export function registerProfileRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/profile' && request.method === 'PUT') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const profile = await services.profile.update(user.id, input);
      json(response, 200, profile);
      return true;
    }
    return false;
  };
}
