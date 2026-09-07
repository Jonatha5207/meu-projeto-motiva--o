const clients = new Set();

export function registerRealtimeClient(response) {
  clients.add(response);
}

export function unregisterRealtimeClient(response) {
  clients.delete(response);
}

export function broadcastRealtime(type, payload = {}) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach(client => client.write(message));
}
