const clients = new Set();
const clientsByUser = new Map(); // userId -> Set<response>
const lastActiveByUser = new Map(); // userId -> timestamp da ultima chamada autenticada
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

// A conexao SSE sozinha e um sinal de "online" fragil demais: no celular, ela
// costuma cair assim que a tela apaga ou o app vai pra segundo plano, fazendo
// a pessoa parecer offline quase na hora mesmo estando com o app aberto.
// Por isso qualquer chamada autenticada (perfil, chat, comunidade etc.) tambem
// conta como "ainda por aqui" por uns minutos, igual "visto por ultimo" de
// outros apps.
export function touchActive(userId) {
  if (userId) lastActiveByUser.set(userId, Date.now());
}

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
  if (clientsByUser.has(userId)) return true;
  const lastActive = lastActiveByUser.get(userId);
  return Boolean(lastActive) && Date.now() - lastActive < ONLINE_WINDOW_MS;
}
