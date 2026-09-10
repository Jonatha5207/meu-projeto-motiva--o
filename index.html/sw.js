const CACHE_NAME = 'companheiro-offline-v62';
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './services.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Chamadas de API nunca podem vir do cache -- comunidade, jogos marcados,
  // localizacao ao vivo etc. precisam sempre da resposta mais recente do servidor.
  // Cachear isso congelava a primeira resposta pra sempre (bug real encontrado em
  // testes: eventos/pessoas novas nunca apareciam depois da primeira carga).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'Companheiro', body: event.data ? event.data.text() : '' }; }
  const title = payload.title || 'Companheiro';
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || '',
    tag: payload.tag || 'companheiro-push',
    renotify: false,
    silent: false,
    vibrate: [180, 80, 180],
    data: { type: 'companheiro-notification', key: payload.key, text: payload.body }
  }));
});

self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const payload = notification.data || {};
  notification.close();
  event.waitUntil((async () => {
    const targetUrl = new URL('./#chat', self.registration.scope).href;
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clientsList.find(item => 'focus' in item);
    if (client) {
      await client.focus();
      client.postMessage({ type: 'notification-opened', key: payload.key, text: payload.text || notification.body });
      return;
    }
    const opened = await clients.openWindow(targetUrl);
    opened?.postMessage({ type: 'notification-opened', key: payload.key, text: payload.text || notification.body });
  })());
});
