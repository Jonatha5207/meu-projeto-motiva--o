export function registerSocialRoutes({ json, readJsonBody, requireUser, services }) {
  return async function handle(request, response) {
    if (request.url === '/api/social/feed' && request.method === 'GET') {
      json(response, 200, await services.social.listFeed());
      return true;
    }
    if (request.url === '/api/social/posts' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const post = await services.social.createPost(user, input);
      json(response, 201, post);
      return true;
    }
    if (request.url?.match(/^\/api\/social\/posts\/[^/]+\/like$/) && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[4];
      const post = await services.social.likePost(id);
      json(response, 200, post);
      return true;
    }
    if (request.url?.match(/^\/api\/social\/posts\/[^/]+\/comments$/) && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[4];
      const input = await readJsonBody(request);
      const comment = await services.social.commentOnPost(user, id, input);
      json(response, 201, comment);
      return true;
    }
    return false;
  };
}
