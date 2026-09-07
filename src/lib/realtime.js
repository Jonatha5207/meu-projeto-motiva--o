const clients = new Set();
const clientsByUser = new Map(); // userId -> Set<response>

export function registerRealtimeClient(response, userId = null) {
  clients.add(response);
  if (userId) {
    if (!clientsByUser.has(userId)) clientsByUser.set(userId, new Set());
    clientsByUser.get(userId).add(response);
  }
}

export function unregisterRealtimeClient(response, userId = null) {
  clients.delete(response);
  if (userId && clientsByUser.has(userId)) {
    const set = clientsByUser.get(userId);
    set.delete(response);
    if (!set.size) clientsByUser.delete(userId);
  }
}

function write(response, type, payload) {
  response.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function broadcastRealtime(type, payload = {}) {
  clients.forEach(client => write(client, type, payload));
}

export function sendToUser(userId, type, payload = {}) {
  const set = clientsByUser.get(userId);
  if (!set) return false;
  set.forEach(client => write(client, type, payload));
  return true;
}

export function isUserOnline(userId) {
  return clientsByUser.has(userId);
}
