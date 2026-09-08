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
    if (request.url === '/api/live-location' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.community.listLiveLocations());
      return true;
    }
    if (request.url === '/api/live-location' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const entry = await services.community.startLiveLocation(user.id, input);
      json(response, 200, entry);
      return true;
    }
    if (request.url === '/api/live-location' && request.method === 'DELETE') {
      const user = await requireUser(request, response); if (!user) return true;
      await services.community.stopLiveLocation(user.id);
      json(response, 204, {});
      return true;
    }
    if (request.url === '/api/pickup-events' && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      json(response, 200, await services.community.listPickupEvents(user.id));
      return true;
    }
    if (request.url === '/api/pickup-events' && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const input = await readJsonBody(request);
      const event = await services.community.createPickupEvent(user.id, input);
      json(response, 201, event);
      return true;
    }
    if (request.url?.match(/^\/api\/pickup-events\/[^/]+\/join$/) && request.method === 'POST') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      const event = await services.community.joinPickupEvent(user.id, id);
      json(response, 200, event);
      return true;
    }
    if (request.url?.match(/^\/api\/pickup-events\/[^/]+\/join$/) && request.method === 'DELETE') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      await services.community.leavePickupEvent(user.id, id);
      json(response, 204, {});
      return true;
    }
    if (request.url?.match(/^\/api\/pickup-events\/[^/]+$/) && request.method === 'DELETE') {
      const user = await requireUser(request, response); if (!user) return true;
      const id = request.url.split('/')[3];
      await services.community.cancelPickupEvent(user.id, id);
      json(response, 204, {});
      return true;
    }
    return false;
  };
}
