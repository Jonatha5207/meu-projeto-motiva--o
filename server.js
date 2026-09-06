import http from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

process.on('uncaughtException', error => console.error('uncaught_exception', error));
process.on('unhandledRejection', error => console.error('unhandled_rejection', error));

const root = fileURLToPath(new URL('.', import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(join(root, '.env'));

const publicDir = join(root, 'index.html');
const dataDir = join(root, '.data');
const dataFile = join(dataDir, 'companheiro.json');
const port = Number(process.env.PORT || 8000);
const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token';
const allowedStates = new Set(['PENDING', 'PREPARING', 'ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NOT_COMPLETED']);
const users = new Map();
const authTokens = new Map();
const profiles = new Map();
const userSessions = new Map();
const analyticsEvents = [];
const objections = ['Cansaço', 'Preguiça', 'Frio', 'Chuva', 'Trabalho', 'Filhos', 'Falta de tempo', 'Falta de vontade', 'Desânimo', 'Falta de companhia', 'Vergonha', 'Dor'].map(name => ({ id: randomUUID(), name, category: 'behavior', active: true }));
const userObjections = new Map();
const feedbacks = [];
const notifications = [];
const deviceTokens = new Map();
const conversations = new Map();
const conversationMessages = new Map();
const socialPosts = [];
const realtimeClients = new Set();

function cleanText(value, max = 240) { return String(value ?? '').trim().slice(0, max); }
function hashPassword(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, stored) { try { const [salt, digest] = stored.split(':'); const actual = scryptSync(password, salt, 64); return timingSafeEqual(actual, Buffer.from(digest, 'hex')); } catch { return false; } }
function authUser(request) { const token = request.headers.authorization?.replace(/^Bearer\s+/i, ''); const userId = token && authTokens.get(token); return userId ? users.get(userId) : null; }
function isAdminAuthorized(request) { const provided = Buffer.from(String(request.headers['x-admin-token'] || '')); const expected = Buffer.from(adminToken); return provided.length === expected.length && timingSafeEqual(provided, expected); }
function requireUser(request, response) { const user = authUser(request); if (!user) { json(response, 401, { error: 'unauthorized' }); return null; } return user; }
function recordEvent(userId, eventName, metadata = {}, trainingSessionId = null) { analyticsEvents.push({ id: randomUUID(), user_id: userId, training_session_id: trainingSessionId, event_name: eventName, metadata, created_at: new Date().toISOString() }); }
function sessionList(userId) { if (!userSessions.has(userId)) userSessions.set(userId, []); return userSessions.get(userId); }
function isFinalStatus(status) { return ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'].includes(status); }
const stateTransitions = { PENDING: ['PREPARING', 'ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'CANCELLED', 'RESCHEDULED'], PREPARING: ['ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'CANCELLED', 'RESCHEDULED'], ENGAGED: ['OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'CANCELLED', 'RESCHEDULED'], OBJECTION: ['ENGAGED', 'PREPARING_TO_GO', 'LEFT', 'NOT_COMPLETED', 'RESCHEDULED'], PREPARING_TO_GO: ['LEFT', 'COMPLETED', 'CANCELLED'], LEFT: ['COMPLETED', 'NOT_COMPLETED'] };
function canTransition(from, to) { return from === to || stateTransitions[from]?.includes(to) || (['COMPLETED', 'NOT_COMPLETED'].includes(to) && !isFinalStatus(from)); }
async function loadPersistentStore() { try { const saved = JSON.parse(await readFile(dataFile, 'utf8')); (saved.users || []).forEach(item => users.set(item.id, item)); (saved.profiles || []).forEach(([id, value]) => profiles.set(id, value)); (saved.sessions || []).forEach(([id, value]) => userSessions.set(id, value)); (saved.userObjections || []).forEach(([id, value]) => userObjections.set(id, value)); (saved.feedbacks || []).forEach(item => feedbacks.push(item)); (saved.notifications || []).forEach(item => notifications.push(item)); (saved.deviceTokens || []).forEach(([id, value]) => deviceTokens.set(id, value)); (saved.conversations || []).forEach(([id, value]) => conversations.set(id, value)); (saved.conversationMessages || []).forEach(([id, value]) => conversationMessages.set(id, value)); (saved.analyticsEvents || []).forEach(item => analyticsEvents.push(item)); (saved.socialPosts || []).forEach(item => socialPosts.push(item)); (saved.notificationState || []).forEach(([id, value]) => notificationState.set(id, value)); } catch { /* First run starts with an empty store. */ } }
function persistStore() { const snapshot = { users: [...users.values()], profiles: [...profiles.entries()], sessions: [...userSessions.entries()], userObjections: [...userObjections.entries()], feedbacks, notifications, deviceTokens: [...deviceTokens.entries()], conversations: [...conversations.entries()], conversationMessages: [...conversationMessages.entries()], analyticsEvents, socialPosts, notificationState: [...notificationState.entries()] }; mkdir(dataDir, { recursive: true }).then(() => writeFile(dataFile, JSON.stringify(snapshot, null, 2), 'utf8')).catch(() => {}); }
function userConversationList(userId) { if (!conversations.has(userId)) conversations.set(userId, []); return conversations.get(userId); }
function broadcastRealtime(type, payload = {}) { const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`; realtimeClients.forEach(client => client.write(message)); }
function socialPostView(post) { return { ...post }; }

const motivationalPhrases = ['Você não precisa sentir vontade. Só precisa dar o próximo passo.', 'Cinco minutos já contam. Começar também é uma vitória.', 'Hoje não é sobre provar nada. É sobre cuidar de você.', 'Um treino de cada vez. Seu futuro agradece a presença de hoje.', 'Você não está sozinho. Eu fico com você até o próximo passo.', 'Não precisa ser perfeito. Precisa ser possível para hoje.', 'Seu ritmo também merece respeito. Vamos começar do jeito que der.', 'A parte mais difícil é começar. Eu fico aqui enquanto você começa.', 'Você já escolheu cuidar de si. Agora vamos transformar isso em um pequeno gesto.', 'Mesmo devagar, você ainda está indo.', 'O treino de hoje é um encontro com a pessoa que você quer ser.', 'Se o dia pesou, vamos diminuir o passo, não abandonar você.', 'Você não precisa carregar tudo sozinho. Vamos resolver só os próximos minutos.', 'A sua presença vale mais do que a sua performance.', 'Quando parecer difícil, me chama. A gente encontra uma versão possível.'];
const NOTIFICATION_OFFSET_MINUTES = { T_MINUS_60: -60, T_MINUS_45: -45, T_MINUS_30: -30, T_MINUS_20: -20 };
const notificationState = new Map();
function getNotificationState(userId) { if (!notificationState.has(userId)) notificationState.set(userId, {}); return notificationState.get(userId); }
function notificationScheduledFor(session, type, durationMinutes = 45) {
  const base = new Date(session.scheduled_at);
  if (Number.isNaN(base.getTime())) return null;
  if (type === 'POST_TRAINING') return new Date(base.getTime() + Math.max(20, durationMinutes + 10) * 60000).toISOString();
  return new Date(base.getTime() + NOTIFICATION_OFFSET_MINUTES[type] * 60000).toISOString();
}
function notificationCopy(type, ctx = {}) {
  switch (type) {
    case 'T_MINUS_60': return { title: 'Hoje tem treino', body: `E aí! Hoje tem ${ctx.activity || 'treino'}. Vamos começar a nos preparar?` };
    case 'T_MINUS_45': return { title: 'Vamos nos preparar?', body: 'Já separou sua roupa?' };
    case 'T_MINUS_30': return { title: 'Estou com você', body: 'Como está sua vontade de ir hoje? De 0 a 10.' };
    case 'T_MINUS_20': return { title: 'Só o próximo passo', body: 'Percebi que você ainda não foi. Está tudo bem. O que está acontecendo?' };
    case 'POST_TRAINING': return { title: 'E aí, você foi?', body: 'Conta pra mim como foi hoje. Sem julgamento, só quero saber de você.' };
    case 'DAILY_MOTIVATION': return { title: 'Companheiro', body: ctx.message || motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)] };
    case 'STREAK_MILESTONE': return { title: 'Isso é constância', body: `Você completou ${ctx.count} treinos com o Companheiro. Isso não é sorte, é constância.` };
    case 'RE_ENGAGEMENT': return { title: 'Sem cobrança', body: 'Faz um tempo que a gente não se fala. Sem cobrança nenhuma — quer retomar quando fizer sentido para você?' };
    default: return { title: 'Companheiro', body: 'Estou aqui com você.' };
  }
}
const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (vapidConfigured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@companheiro.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
async function sendWebPushToUser(userId, payload) {
  if (!vapidConfigured) return;
  const tokens = [...deviceTokens.values()].filter(item => item.user_id === userId && item.platform === 'WEB' && item.active);
  await Promise.all(tokens.map(async item => {
    try { await webpush.sendNotification(JSON.parse(item.device_token), JSON.stringify(payload)); }
    catch (error) { if (error.statusCode === 404 || error.statusCode === 410) item.active = false; }
  }));
}
async function processScheduledNotifications() {
  const now = Date.now();
  const finalStates = ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'];
  const prepTypes = ['T_MINUS_60', 'T_MINUS_45', 'T_MINUS_30', 'T_MINUS_20'];
  for (const notification of notifications) {
    if (notification.status !== 'SCHEDULED' || new Date(notification.scheduled_for).getTime() > now) continue;
    const session = sessionList(notification.user_id).find(item => item.id === notification.training_session_id);
    if (!session || finalStates.includes(session.status) || (prepTypes.includes(notification.type) && ['PREPARING_TO_GO', 'LEFT'].includes(session.status))) { notification.status = 'CANCELLED'; continue; }
    if (profiles.get(notification.user_id)?.notifications_enabled === false) { notification.status = 'CANCELLED'; continue; }
    const copy = notificationCopy(notification.type, { activity: session.activity });
    await sendWebPushToUser(notification.user_id, { title: copy.title, body: copy.body, key: notification.type, tag: `companheiro-${notification.type.toLowerCase()}` });
    notification.status = 'SENT'; notification.sent_at = new Date().toISOString();
    recordEvent(notification.user_id, 'NOTIFICATION_SENT', { type: notification.type }, notification.training_session_id);
  }
}
async function processDailyMotivation() {
  if (new Date().getHours() < 8) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  for (const user of users.values()) {
    if (profiles.get(user.id)?.notifications_enabled === false) continue;
    const state = getNotificationState(user.id);
    if (state.lastDailyMotivationDate === todayKey) continue;
    state.lastDailyMotivationDate = todayKey;
    const copy = notificationCopy('DAILY_MOTIVATION');
    await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'DAILY_MOTIVATION', tag: 'companheiro-daily' });
    recordEvent(user.id, 'DAILY_MOTIVATION_SENT', {});
  }
}
async function processStreakMilestones() {
  const thresholds = [5, 10, 25, 50, 100];
  for (const user of users.values()) {
    const completed = sessionList(user.id).filter(item => item.status === 'COMPLETED').length;
    const state = getNotificationState(user.id);
    const nextThreshold = thresholds.find(value => value <= completed && (state.lastStreakMilestone || 0) < value);
    if (!nextThreshold) continue;
    state.lastStreakMilestone = nextThreshold;
    const copy = notificationCopy('STREAK_MILESTONE', { count: nextThreshold });
    await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'STREAK_MILESTONE', tag: 'companheiro-streak' });
    recordEvent(user.id, 'STREAK_MILESTONE_SENT', { count: nextThreshold });
  }
}
async function processReEngagement() {
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const user of users.values()) {
    if (profiles.get(user.id)?.notifications_enabled === false) continue;
    const sessions = sessionList(user.id);
    if (!sessions.length) continue;
    const lastActivity = Math.max(...sessions.map(item => new Date(item.updated_at || item.created_at).getTime()));
    if (now - lastActivity < threeDaysMs) continue;
    const state = getNotificationState(user.id);
    if (state.lastReEngagementAt && now - new Date(state.lastReEngagementAt).getTime() < threeDaysMs) continue;
    state.lastReEngagementAt = new Date().toISOString();
    const copy = notificationCopy('RE_ENGAGEMENT');
    await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'RE_ENGAGEMENT', tag: 'companheiro-reengage' });
    recordEvent(user.id, 'RE_ENGAGEMENT_SENT', {});
  }
}
function runNotificationScheduler() {
  Promise.all([processScheduledNotifications(), processDailyMotivation(), processStreakMilestones(), processReEngagement()]).then(persistStore).catch(() => {});
}

const fallback = message => {
  const text = String(message || '').toLowerCase();
  if (text.includes('dor') || text.includes('mal')) return 'Se você está com dor ou não está bem, não quero que se force. Cuide de você primeiro.';
  if (text.includes('cansad')) return 'Entendi. É cansaço físico ou falta de vontade de começar?';
  if (text.includes('tempo')) return 'Hoje parece falta de tempo, não falta de disciplina. Quer fazer menos tempo ou remarcar?';
  if (text.includes('sem vontade') || text.includes('pregui')) return 'Vamos deixar pequeno: roupa e tênis. Depois você decide o próximo passo.';
  return 'Estou aqui com você. O que está te segurando agora?';
};

function json(response, status, body, extraHeaders = {}) {
  persistStore();
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Realtime-Session', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', ...extraHeaders });
  response.end(JSON.stringify(body));
}
const MAX_BODY_BYTES = 1_000_000;
async function body(request) {
  let raw = ''; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) { const error = new Error('payload_too_large'); error.statusCode = 413; throw error; }
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}
const OPENAI_TIMEOUT_MS = 20000;
async function aiResponse(input) {
  if (!process.env.OPENAI_API_KEY) return { response_text: fallback(input.message), source: 'fallback' };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.7, messages: [{ role: 'system', content: 'Você é um amigo humano, acolhedor e direto. Não gere culpa. Faça uma pergunta por vez. Se houver dor, não incentive exercício. Responda em português brasileiro, brevemente.' }, { role: 'user', content: JSON.stringify(input) }] }), signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
    if (!response.ok) return { response_text: fallback(input.message), source: 'fallback' };
    const result = await response.json(); return { response_text: result.choices?.[0]?.message?.content || fallback(input.message), source: 'ai' };
  } catch { return { response_text: fallback(input.message), source: 'fallback' }; }
}
async function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const relativePath = requested.replace(/^\/+/, '');
  const safePath = normalize(join(publicDir, relativePath)).startsWith(publicDir)
    ? normalize(join(publicDir, relativePath))
    : join(publicDir, 'index.html');
  try { const content = await readFile(safePath); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }; response.writeHead(200, { 'Content-Type': `${types[extname(safePath)] || 'application/octet-stream'}; charset=utf-8` }); response.end(content); } catch { response.writeHead(404); response.end('Not found'); }
}
async function motivationAudio(input) {
  const text = cleanText(input.text, 4096);
  if (!text) return { status: 400, body: { error: 'invalid_audio_text' } };
  if (!process.env.OPENAI_API_KEY) return { status: 501, body: { error: 'configure_openai_api_key', message: 'Configure OPENAI_API_KEY no backend para ativar a voz humana.' } };
  try {
    const providerResponse = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.OPENAI_TTS_VOICE || 'coral', input: text, instructions: 'Fale em português brasileiro, com tom humano, acolhedor, calmo e breve.', response_format: 'mp3' }), signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
    if (!providerResponse.ok) return { status: 502, body: { error: 'tts_provider_unavailable' } };
    return { status: 200, audio: Buffer.from(await providerResponse.arrayBuffer()) };
  } catch { return { status: 504, body: { error: 'tts_provider_timeout' } }; }
}
async function listVoiceConsents(limit = 20) {
  if (!process.env.OPENAI_API_KEY) return { status: 501, body: { error: 'configure_openai_api_key' } };
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  try {
    const providerResponse = await fetch(`https://api.openai.com/v1/audio/voice_consents?limit=${safeLimit}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
    const result = await providerResponse.json();
    return { status: providerResponse.status, body: result };
  } catch { return { status: 504, body: { error: 'voice_consents_timeout' } }; }
}
async function updateVoiceConsent(consentId, input) {
  const id = cleanText(consentId, 120);
  const name = cleanText(input.name, 120);
  if (!/^cons_[A-Za-z0-9_-]+$/.test(id) || !name) return { status: 400, body: { error: 'invalid_voice_consent' } };
  if (!process.env.OPENAI_API_KEY) return { status: 501, body: { error: 'configure_openai_api_key' } };
  try {
    const providerResponse = await fetch(`https://api.openai.com/v1/audio/voice_consents/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ name }), signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
    const result = await providerResponse.json();
    return { status: providerResponse.status, body: result };
  } catch { return { status: 504, body: { error: 'voice_consents_timeout' } }; }
}
async function realtimeCall(sdp) {
  if (!process.env.OPENAI_API_KEY) return { status: 501, body: { error: 'configure_openai_api_key' } };
  const form = new FormData();
  form.append('sdp', new Blob([sdp], { type: 'application/sdp' }), 'offer.sdp');
  form.append('session', new Blob([JSON.stringify({ type: 'realtime', model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime', output_modalities: ['audio'], instructions: 'Fale em português brasileiro. Seja humano, breve, acolhedor e não gere culpa.' })], { type: 'application/json' }));
  try {
    const providerResponse = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
    const answer = await providerResponse.text();
    return { status: providerResponse.status, answer, contentType: providerResponse.headers.get('content-type') || 'text/plain' };
  } catch { return { status: 504, body: { error: 'realtime_timeout' } }; }
}
const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  try {
    if (request.url?.startsWith('/api/realtime') && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
      response.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      realtimeClients.add(response);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20000);
      request.on('close', () => { clearInterval(heartbeat); realtimeClients.delete(response); });
      return;
    }
    if (request.url === '/api/health') return json(response, 200, { ok: true, service: 'companheiro-api' });
    if (request.url === '/api/push/public-key' && request.method === 'GET') return json(response, 200, { publicKey: vapidConfigured ? process.env.VAPID_PUBLIC_KEY : null });
    if (request.url === '/api/social/feed' && request.method === 'GET') return json(response, 200, socialPosts.slice(-50).reverse().map(socialPostView));
    if (request.url === '/api/social/posts' && request.method === 'POST') {
      const user = requireUser(request, response); if (!user) return;
      const input = await body(request); const text = cleanText(input.text, 280); const activity = cleanText(input.activity || profiles.get(user.id)?.activity || 'Atividade', 80);
      if (!text) return json(response, 400, { error: 'invalid_post' });
      const post = { id: randomUUID(), user_id: user.id, author: user.name, activity, text, likes: 0, comments: 0, created_at: new Date().toISOString() };
      socialPosts.push(post); broadcastRealtime('feed-updated', post); return json(response, 201, socialPostView(post));
    }
    if (request.url?.match(/^\/api\/social\/posts\/[^/]+\/like$/) && request.method === 'POST') {
      const user = requireUser(request, response); if (!user) return;
      const id = request.url.split('/')[4]; const post = socialPosts.find(item => item.id === id); if (!post) return json(response, 404, { error: 'post_not_found' });
      post.likes += 1; broadcastRealtime('feed-updated', post); return json(response, 200, socialPostView(post));
    }
    if (request.url?.match(/^\/api\/social\/posts\/[^/]+\/comments$/) && request.method === 'POST') {
      const user = requireUser(request, response); if (!user) return;
      const id = request.url.split('/')[4]; const post = socialPosts.find(item => item.id === id); if (!post) return json(response, 404, { error: 'post_not_found' });
      const input = await body(request); const text = cleanText(input.text, 280); if (!text) return json(response, 400, { error: 'invalid_comment' });
      post.comments += 1; broadcastRealtime('feed-updated', post); return json(response, 201, { id: randomUUID(), post_id: id, author: user.name, text, created_at: new Date().toISOString() });
    }
    if (request.url === '/api/auth/register' && request.method === 'POST') {
      const input = await body(request); const name = cleanText(input.name, 80); const email = cleanText(input.email, 160).toLowerCase(); const password = String(input.password || '');
      if (name.length < 2 || !email.includes('@') || password.length < 8 || password.length > 200) return json(response, 400, { error: 'invalid_registration' });
      if ([...users.values()].some(user => user.email === email)) return json(response, 409, { error: 'email_already_registered' });
      const id = randomUUID(); const user = { id, name, email, password_hash: hashPassword(password), created_at: new Date().toISOString() }; users.set(id, user); profiles.set(id, {}); const token = randomUUID(); authTokens.set(token, id); recordEvent(id, 'ONBOARDING_STARTED'); return json(response, 201, { user: { id, name, email }, token });
    }
    if (request.url === '/api/auth/login' && request.method === 'POST') {
      const input = await body(request); const email = cleanText(input.email, 160).toLowerCase(); const loginPassword = String(input.password || ''); const user = [...users.values()].find(item => item.email === email);
      if (!user || loginPassword.length > 200 || !verifyPassword(loginPassword, user.password_hash)) return json(response, 401, { error: 'invalid_credentials' });
      const token = randomUUID(); authTokens.set(token, user.id); return json(response, 200, { user: { id: user.id, name: user.name, email: user.email }, token });
    }
    if (request.url === '/api/me' && request.method === 'GET') { const user = requireUser(request, response); if (!user) return; return json(response, 200, { user: { id: user.id, name: user.name, email: user.email }, profile: profiles.get(user.id) || {}, sessions: sessionList(user.id) }); }
    if (request.url === '/api/me' && request.method === 'DELETE') { const user = requireUser(request, response); if (!user) return; const userId = user.id; users.delete(userId); profiles.delete(userId); userSessions.delete(userId); userObjections.delete(userId); feedbacks.splice(0, feedbacks.length, ...feedbacks.filter(item => item.user_id !== userId)); notifications.splice(0, notifications.length, ...notifications.filter(item => item.user_id !== userId)); analyticsEvents.splice(0, analyticsEvents.length, ...analyticsEvents.filter(item => item.user_id !== userId)); deviceTokens.forEach((item, key) => { if (item.user_id === userId) deviceTokens.delete(key); }); const userConversations = conversations.get(userId) || []; userConversations.forEach(item => conversationMessages.delete(item.id)); conversations.delete(userId); authTokens.forEach((id, token) => { if (id === userId) authTokens.delete(token); }); return json(response, 204, {}); }
    if (request.url === '/api/profile' && request.method === 'PUT') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const previous = profiles.get(user.id) || {}; const cleanList = (value, max = 20, itemMax = 100) => Array.isArray(value) ? value.map(item => cleanText(item, itemMax)).filter(Boolean).slice(0, max) : undefined; const profile = { ...previous, activity: cleanText(input.activity || previous.activity || 'Atividade', 80), activities: cleanList(input.activities) || previous.activities || [], frequency: Math.max(1, Math.min(7, Number(input.frequency) || 1)), days: cleanList(input.days, 7, 20) || previous.days || [], time: /^\d{2}:\d{2}$/.test(input.time) ? input.time : previous.time || '19:00', duration: Math.max(5, Math.min(240, Number(input.duration) || previous.duration || 45)), location: cleanText(input.location || previous.location, 160), commuteTime: cleanText(input.commuteTime || previous.commuteTime, 80), transport: cleanText(input.transport || previous.transport, 80), routines: Array.isArray(input.routines) ? input.routines.slice(0, 12) : previous.routines || [], goal: cleanText(input.goal || previous.goal, 160), motivation: cleanText(input.motivation || previous.motivation, 160), personalizedMotivation: cleanText(input.personalizedMotivation || previous.personalizedMotivation, 240), difficulty: cleanText(input.difficulty || previous.difficulty, 160), objections: cleanList(input.objections, 20, 80) || previous.objections || [], objection: cleanText(input.objection || previous.objection, 80), disciplineLevel: cleanText(input.disciplineLevel || previous.disciplineLevel, 120), workStatus: cleanText(input.workStatus || previous.workStatus, 120), studyStatus: cleanText(input.studyStatus || previous.studyStatus, 120), hasChildren: cleanText(input.hasChildren || previous.hasChildren, 40), notifications_enabled: input.notifications_enabled !== undefined ? Boolean(input.notifications_enabled) : (previous.notifications_enabled !== undefined ? previous.notifications_enabled : true), updated_at: new Date().toISOString() }; profiles.set(user.id, profile); recordEvent(user.id, 'ONBOARDING_COMPLETED'); return json(response, 200, profile); }
    if (request.url === '/api/objections' && request.method === 'GET') return json(response, 200, objections.filter(item => item.active));
    if (request.url === '/api/objections' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const objection = objections.find(item => item.id === input.objection_id || item.name.toLowerCase() === cleanText(input.name).toLowerCase()); if (!objection) return json(response, 404, { error: 'objection_not_found' }); const links = userObjections.get(user.id) || []; const link = links.find(item => item.objection_id === objection.id); if (link) { link.frequency += 1; link.last_occurred_at = new Date().toISOString(); } else links.push({ id: randomUUID(), user_id: user.id, objection_id: objection.id, frequency: 1, last_occurred_at: new Date().toISOString(), created_at: new Date().toISOString() }); userObjections.set(user.id, links); recordEvent(user.id, 'OBJECTION_IDENTIFIED', { objection: objection.name }); return json(response, 201, links.at(-1)); }
    if (request.url === '/api/feedback' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const session = sessionList(user.id).find(item => item.id === input.training_session_id); if (!session) return json(response, 404, { error: 'session_not_found' }); const feedback = { id: randomUUID(), user_id: user.id, training_session_id: session.id, completed: Boolean(input.completed), feeling: cleanText(input.feeling, 80), reason_not_completed: cleanText(input.reason_not_completed, 160), comment: cleanText(input.comment, 500), created_at: new Date().toISOString() }; feedbacks.push(feedback); recordEvent(user.id, 'FEEDBACK_SUBMITTED', {}, session.id); return json(response, 201, feedback); }
    if (request.url === '/api/devices' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const token = cleanText(input.device_token, 2000); const platform = cleanText(input.platform, 20).toUpperCase(); if (!token || !['ANDROID', 'IOS', 'WEB'].includes(platform)) return json(response, 400, { error: 'invalid_device' }); const device = { id: randomUUID(), user_id: user.id, device_token: token, platform, active: true, updated_at: new Date().toISOString() }; deviceTokens.set(token, device); return json(response, 201, device); }
    if (request.url === '/api/notifications' && request.method === 'GET') { const user = requireUser(request, response); if (!user) return; return json(response, 200, notifications.filter(item => item.user_id === user.id)); }
    if (request.url === '/api/conversations' && request.method === 'GET') { const user = requireUser(request, response); if (!user) return; return json(response, 200, userConversationList(user.id)); }
    if (request.url === '/api/conversations' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const conversation = { id: randomUUID(), user_id: user.id, training_session_id: input.training_session_id || null, started_at: new Date().toISOString(), status: 'ACTIVE', created_at: new Date().toISOString() }; userConversationList(user.id).push(conversation); conversationMessages.set(conversation.id, []); recordEvent(user.id, 'CHAT_STARTED', {}, conversation.training_session_id); return json(response, 201, conversation); }
    if (request.url?.match(/^\/api\/conversations\/[^/]+\/messages$/) && request.method === 'GET') { const user = requireUser(request, response); if (!user) return; const id = request.url.split('/')[3]; if (!userConversationList(user.id).some(item => item.id === id)) return json(response, 404, { error: 'conversation_not_found' }); return json(response, 200, conversationMessages.get(id) || []); }
    if (request.url?.match(/^\/api\/conversations\/[^/]+\/messages$/) && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const id = request.url.split('/')[3]; const conversation = userConversationList(user.id).find(item => item.id === id); if (!conversation) return json(response, 404, { error: 'conversation_not_found' }); const input = await body(request); const message = { id: randomUUID(), conversation_id: id, sender_type: ['APP', 'USER', 'SYSTEM'].includes(input.sender_type) ? input.sender_type : 'USER', message: cleanText(input.message, 1000), message_type: ['TEXT', 'QUICK_REPLY', 'SYSTEM'].includes(input.message_type) ? input.message_type : 'TEXT', ai_generated: Boolean(input.ai_generated), created_at: new Date().toISOString() }; if (!message.message) return json(response, 400, { error: 'invalid_message' }); conversationMessages.get(id).push(message); return json(response, 201, message); }
    if (request.url === '/api/companion-chat' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; return json(response, 200, await aiResponse(await body(request))); }
    if (request.url === '/api/sessions' && request.method === 'GET') { const user = requireUser(request, response); if (!user) return; return json(response, 200, sessionList(user.id)); }
    if (request.url === '/api/sessions' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); if (!allowedStates.has(input.status || 'PENDING')) return json(response, 400, { error: 'invalid_session_state' }); const session = { id: randomUUID(), user_id: user.id, activity: cleanText(input.activity || profiles.get(user.id)?.activity || 'Atividade', 80), scheduled_at: cleanText(input.scheduled_at, 40), status: input.status || 'PENDING', created_at: new Date().toISOString() }; sessionList(user.id).push(session); const sessionDuration = Number(profiles.get(user.id)?.duration) || 45; ['T_MINUS_60', 'T_MINUS_45', 'T_MINUS_30', 'T_MINUS_20', 'POST_TRAINING'].forEach(type => { const scheduledFor = notificationScheduledFor(session, type, sessionDuration); if (scheduledFor) notifications.push({ id: randomUUID(), user_id: user.id, training_session_id: session.id, type, scheduled_for: scheduledFor, status: 'SCHEDULED', created_at: new Date().toISOString() }); }); recordEvent(user.id, 'TRAINING_CREATED', {}, session.id); return json(response, 201, session); }
    if (request.url?.startsWith('/api/sessions/') && request.method === 'PATCH') { const user = requireUser(request, response); if (!user) return; const id = request.url.split('/').pop(); const session = sessionList(user.id).find(item => item.id === id); if (!session) return json(response, 404, { error: 'session_not_found' }); const input = await body(request); if (input.status && (!allowedStates.has(input.status) || !canTransition(session.status, input.status))) return json(response, 400, { error: 'invalid_session_transition' }); const previousStatus = session.status; const previousRescued = Boolean(session.rescued); const patch = { status: input.status || session.status, updated_at: new Date().toISOString() }; if (input.rescue_opportunity !== undefined) patch.rescue_opportunity = Boolean(input.rescue_opportunity); if (input.rescued !== undefined) patch.rescued = Boolean(input.rescued); if (input.feeling !== undefined) patch.feeling = cleanText(input.feeling, 80); if (input.reason_not_completed !== undefined) patch.reason_not_completed = cleanText(input.reason_not_completed, 160); Object.assign(session, patch); if (isFinalStatus(session.status)) notifications.filter(item => item.training_session_id === id && item.type !== 'POST_TRAINING').forEach(item => { item.status = 'CANCELLED'; }); if (session.status === 'COMPLETED') recordEvent(user.id, 'TRAINING_COMPLETED', {}, id); if (session.status === 'RESCHEDULED') recordEvent(user.id, 'TRAINING_RESCHEDULED', {}, id); if (session.status === 'NOT_COMPLETED') recordEvent(user.id, 'TRAINING_NOT_COMPLETED', {}, id); if (session.status === 'PREPARING_TO_GO' && previousStatus !== 'PREPARING_TO_GO') recordEvent(user.id, 'TRAINING_CONFIRMED', {}, id); if (session.rescued && !previousRescued) recordEvent(user.id, 'RESCUE_SUCCESS', {}, id); return json(response, 200, session); }
    if (request.url === '/api/events' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const input = await body(request); const allowedEvent = cleanText(input.event_name, 80); if (!allowedEvent) return json(response, 400, { error: 'invalid_event' }); recordEvent(user.id, allowedEvent, input.metadata || {}, input.training_session_id || null); return json(response, 201, { ok: true }); }
    if (request.url === '/api/admin/metrics' && request.method === 'GET') { if (!isAdminAuthorized(request)) return json(response, 401, { error: 'admin_unauthorized' }); const allSessions = [...userSessions.values()].flat(); const opportunities = allSessions.filter(item => item.rescue_opportunity).length; const rescues = allSessions.filter(item => item.rescued).length; return json(response, 200, { users: { total: users.size, active: users.size }, sessions: { planned: allSessions.filter(item => item.status === 'PENDING').length, completed: allSessions.filter(item => item.status === 'COMPLETED').length, not_completed: allSessions.filter(item => item.status === 'NOT_COMPLETED').length, rescheduled: allSessions.filter(item => item.status === 'RESCHEDULED').length }, conversations: { events: analyticsEvents.filter(item => item.event_name === 'CHAT_STARTED').length, objections: analyticsEvents.filter(item => item.event_name === 'OBJECTION_IDENTIFIED').length }, rescue_rate: opportunities ? Math.round((rescues / opportunities) * 100) : 0 }); }
    if (request.url?.startsWith('/api/admin/voice-consents/') && request.method === 'POST') { if (!isAdminAuthorized(request)) return json(response, 401, { error: 'admin_unauthorized' }); const consentId = request.url.split('/').pop().split('?')[0]; const result = await updateVoiceConsent(consentId, await body(request)); return json(response, result.status, result.body); }
    if (request.url?.startsWith('/api/admin/voice-consents') && request.method === 'GET') { if (!isAdminAuthorized(request)) return json(response, 401, { error: 'admin_unauthorized' }); const limit = new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('limit'); const result = await listVoiceConsents(limit); return json(response, result.status, result.body); }
    if (request.url === '/api/realtime-call' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const chunks = []; let sdpSize = 0; for await (const chunk of request) { sdpSize += chunk.length; if (sdpSize > MAX_BODY_BYTES) { const error = new Error('payload_too_large'); error.statusCode = 413; throw error; } chunks.push(chunk); } const result = await realtimeCall(Buffer.concat(chunks).toString()); if (result.answer) { response.writeHead(result.status, { 'Content-Type': result.contentType, 'Access-Control-Allow-Origin': '*' }); response.end(result.answer); } else return json(response, result.status, result.body); }
    if (request.url === '/api/motivation-audio' && request.method === 'POST') { const user = requireUser(request, response); if (!user) return; const result = await motivationAudio(await body(request)); if (result.audio) { response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); response.end(result.audio); } else return json(response, result.status, result.body); }
    return serveStatic(request, response);
  } catch (error) {
    const status = error.statusCode || 500;
    return json(response, status, status === 413 ? { error: 'payload_too_large' } : { error: 'internal_error', message: error.message }, status === 413 ? { Connection: 'close' } : {});
  }
});
await loadPersistentStore();
setInterval(runNotificationScheduler, 60000);
server.listen(port, () => console.log(`Companheiro API em http://localhost:${port}`));
