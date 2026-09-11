const app = document.querySelector('#app'); 
const STORAGE_KEY = 'companheiro-mvp';
const API_ORIGIN = window.COMPANHEIRO_CONFIG?.apiOrigin || (location.protocol === 'http:' || location.protocol === 'https:' ? location.origin : '');
const AI_ENDPOINT = window.COMPANHEIRO_CONFIG?.aiEndpoint || (API_ORIGIN ? `${API_ORIGIN}/api/companion-chat` : '');
const HUMAN_AUDIO_ENDPOINT = window.COMPANHEIRO_CONFIG?.audioEndpoint || (API_ORIGIN ? `${API_ORIGIN}/api/motivation-audio` : '');
const AUTH_TOKEN_KEY = 'companheiro-auth-token';
const GUILT_PHRASES = ['você está falhando', 'você está decepcionando', 'você é preguiçoso', 'você é preguiçosa', 'tenha vergonha', 'todo mundo está treinando', 'você nunca vai conseguir'];
const TTS_VOICE_LABELS = [['coral', 'Coral (calorosa)'], ['nova', 'Nova (energética)'], ['shimmer', 'Shimmer (suave)'], ['alloy', 'Alloy (neutra)'], ['onyx', 'Onyx (grave)'], ['echo', 'Echo (masculina)'], ['fable', 'Fable (narrativa)'], ['ash', 'Ash (grave e direta)'], ['sage', 'Sage (serena)'], ['verse', 'Verse (expressiva)'], ['ballad', 'Ballad (suave e lenta)']];
const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
const motivationalPhrases = [
  'Você não precisa sentir vontade. Só precisa dar o próximo passo.',
  'Cinco minutos já contam. Começar também é uma vitória.',
  'Hoje não é sobre provar nada. É sobre cuidar de você.',
  'Um treino de cada vez. Seu futuro agradece a presença de hoje.',
  'Você não está sozinho. Eu fico com você até o próximo passo.',
  'Não precisa ser perfeito. Precisa ser possível para hoje.',
  'Seu ritmo também merece respeito. Vamos começar do jeito que der.',
  'A parte mais difícil é começar. Eu fico aqui enquanto você começa.',
  'Você já escolheu cuidar de si. Agora vamos transformar isso em um pequeno gesto.',
  'Mesmo devagar, você ainda está indo.',
  'O treino de hoje é um encontro com a pessoa que você quer ser.',
  'Se o dia pesou, vamos diminuir o passo, não abandonar você.',
  'Você não precisa carregar tudo sozinho. Vamos resolver só os próximos minutos.',
  'A sua presença vale mais do que a sua performance.',
  'Quando parecer difícil, me chama. A gente encontra uma versão possível.',
  'Bora. Você já venceu a parte mais difícil só de estar aqui.',
  'Sente essa energia? Ela tá esperando você usar.',
  'Cada treino é um degrau. Sobe mais um hoje.',
  'Você é mais forte do que a desculpa de hoje.',
  'A melhor versão de você tá a um treino de distância.',
  'Hoje o jogo é simples: aparecer e dar o seu melhor.',
  'Sua energia de hoje vira resultado amanhã. Bora buscar.',
  'Ninguém vai fazer por você — e você não precisa fazer sozinho também.'
];
const sportMotivations = {
  Academia: ['Seu treino de forca comeca com um movimento. Vamos fazer o primeiro.', 'Hoje voce nao precisa levantar o mundo. So precisa aparecer na academia.'],
  Corrida: ['A primeira passada e o comeco de todo percurso. Vamos no seu ritmo.', 'Nao precisa correr rapido hoje. Precisa apenas sair e encontrar seu passo.'],
  Caminhada: ['Uma caminhada ja e cuidado em movimento. Vamos respirar e comecar.', 'Coloque um tenis confortavel. O mundo fica um pouco mais leve depois de andar.'],
  'Nata\u00e7\u00e3o': ['A agua espera por voce. Comece com calma e encontre seu ritmo.', 'Cada volta conta. Hoje vamos apenas chegar a piscina.'],
  Ciclismo: ['A bicicleta leva voce para frente, uma pedalada por vez.', 'Capacete, agua e primeiro giro. O resto acontece no caminho.'],
  'Danca': ['Coloque sua musica favorita. Seu corpo ja sabe como comecar.', 'Hoje nao e apresentacao. E so deixar o corpo encontrar alegria.']
};
const initialData = {
  authenticated: false,
  onboarded: false,
  profile: { name: 'João', activity: 'Academia', activities: [], frequency: 3, days: ['Segunda', 'Quarta', 'Sexta'], scheduleByDay: {}, time: '19:00', duration: 45, location: 'Não informado', commuteTime: 'Não informado', transport: 'Não informado', activeSchedule: true, notificationsEnabled: false, goal: 'Cuidar de mim', motivation: '', personalizedMotivation: '', difficulty: 'Manter constância', objections: [], objection: 'Cansaço', disciplineLevel: 'Estou começando agora.', workStatus: 'Não informado', studyStatus: 'Não informado', hasChildren: 'Não informado', voicePreference: 'coral' },
  session: { status: 'PENDING', date: new Date().toISOString(), activity: 'Academia', time: '19:00', journey: {}, confirmed: false },
  messages: [{ from: 'app', text: 'Hoje tem treino. Vamos começar a nos preparar?' }],
  history: [],
  memory: { objections: {}, lastObjection: null, lastIntent: null },
  analytics: { rescueOpportunities: 0, rescues: 0, events: [] },
  community: { requests: [], ratings: {}, checkedInDate: null, challengeJoined: false, challengeProgress: 0, goalPeriod: 'week', people: [], connections: [], pulses: [], messages: {}, activeChat: null, pickupEventMessages: {}, activePickupEventChat: null, teamSplits: {}, posts: [
    { id: 'post-1', author: 'Marina', activity: 'Corrida', text: 'Completei meus primeiros 5 km do mês. Um passo de cada vez.', likes: 24, liked: false, comments: 5, minutes: 18 },
    { id: 'post-2', author: 'Rafael', activity: 'Academia', text: 'Treino curto hoje, mas apareci. Constancia vence a perfeicao.', likes: 16, liked: false, comments: 3, minutes: 42 },
    { id: 'post-3', author: 'Bianca', activity: 'Yoga', text: 'Respirar, alongar e voltar para o presente.', likes: 31, liked: false, comments: 7, minutes: 65 }
  ] },
  rewards: { points: 0, streak: 0, badges: [] },
  customization: { appName: 'Companheiro', theme: 'light', accent: 'green', sport: 'Academia' }
};
const sportCatalog = ['Academia', 'Corrida', 'Caminhada', 'Natação', 'Ciclismo', 'Crossfit', 'Dança', 'Futebol', 'Futsal', 'Basquete', 'Vôlei', 'Tênis', 'Beach Tennis', 'Badminton', 'Squash', 'Yoga', 'Pilates', 'Alongamento', 'Boxe', 'Jiu-Jitsu', 'Muay Thai', 'Karatê', 'Taekwondo', 'MMA', 'Skate', 'Surf', 'Remo', 'Canoagem', 'Stand up paddle', 'Escalada', 'Atletismo', 'Ginástica', 'Handebol', 'Rugby', 'Críquete', 'Beisebol', 'Softbol', 'Hóquei', 'Polo aquático', 'Patinação', 'Triatlo', 'Outra'];
const sportAccent = { 'Academia': 'orange', 'Corrida': 'orange', 'Crossfit': 'orange', 'Boxe': 'orange', 'Jiu-Jitsu': 'orange', 'Muay Thai': 'orange', 'Karatê': 'orange', 'Taekwondo': 'orange', 'MMA': 'orange', 'Futebol': 'orange', 'Futsal': 'orange', 'Basquete': 'orange', 'Handebol': 'orange', 'Rugby': 'orange', 'Atletismo': 'orange', 'Natação': 'blue', 'Ciclismo': 'blue', 'Surf': 'blue', 'Remo': 'blue', 'Canoagem': 'blue', 'Stand up paddle': 'blue', 'Polo aquático': 'blue', 'Triatlo': 'blue', 'Vôlei': 'blue', 'Tênis': 'blue', 'Beach Tennis': 'blue', 'Badminton': 'blue', 'Squash': 'blue', 'Hóquei': 'blue', 'Patinação': 'blue', 'Yoga': 'green', 'Pilates': 'green', 'Alongamento': 'green', 'Caminhada': 'green', 'Dança': 'green', 'Escalada': 'green', 'Ginástica': 'green', 'Skate': 'green', 'Críquete': 'green', 'Beisebol': 'green', 'Softbol': 'green', 'Outra': 'green' };
const meetingPointCatalog = [
  { id: 'ibirapuera-sp', name: 'Parque Ibirapuera', city: 'São Paulo, SP', lat: -23.5874, lng: -46.6576, activities: ['Corrida', 'Caminhada', 'Ciclismo'], members: 28, note: 'Área pública, movimentada e com boa iluminação.' },
  { id: 'flamengo-rj', name: 'Aterro do Flamengo', city: 'Rio de Janeiro, RJ', lat: -22.9339, lng: -43.1719, activities: ['Corrida', 'Caminhada', 'Ciclismo', 'Skate'], members: 21, note: 'Ponto amplo para combinar durante o dia.' },
  { id: 'pampulha-bh', name: 'Orla da Pampulha', city: 'Belo Horizonte, MG', lat: -19.8517, lng: -44.0122, activities: ['Corrida', 'Caminhada', 'Ciclismo'], members: 16, note: 'Encontro em espaço aberto e conhecido.' },
  { id: 'parque-cidade-bsb', name: 'Parque da Cidade', city: 'Brasília, DF', lat: -15.7975, lng: -47.9028, activities: ['Corrida', 'Caminhada', 'Yoga', 'Ciclismo'], members: 13, note: 'Escolha um ponto visível dentro do parque.' },
  { id: 'parque-barigui-curitiba', name: 'Parque Barigui', city: 'Curitiba, PR', lat: -25.4244, lng: -49.3073, activities: ['Corrida', 'Caminhada', 'Ciclismo'], members: 11, note: 'Combine sempre em área pública e movimentada.' },
  { id: 'marco-zero-recife', name: 'Marco Zero', city: 'Recife, PE', lat: -8.0632, lng: -34.8711, activities: ['Caminhada', 'Corrida', 'Dança'], members: 9, note: 'Ponto cultural conhecido para iniciar juntos.' },
  { id: 'qualquer-cidade', name: 'Ainda não encontrei um ponto', city: 'Sugira um local público', lat: -14.235, lng: -51.925, activities: sportCatalog, members: 0, note: 'A rede está crescendo. Nunca compartilhe seu endereço.' }
];
const isFirstEverLaunch = !localStorage.getItem(STORAGE_KEY);
let data = load();
data.profile = { ...initialData.profile, ...(data.profile || {}) };
data.rewards = { ...initialData.rewards, ...(data.rewards || {}) };
data.memory = { ...initialData.memory, ...(data.memory || {}), objections: { ...(data.memory?.objections || {}) } };
data.analytics = { ...initialData.analytics, ...(data.analytics || {}) };
data.analytics.events = data.analytics.events || [];
data.community = { ...initialData.community, ...(data.community || {}), ratings: { ...(data.community?.ratings || {}) } };
data.community.meetingPointIds = data.community.meetingPointIds || [];
data.community.posts = data.community.posts || initialData.community.posts;
data.customization = { ...initialData.customization, ...(data.customization || {}) };
if (isFirstEverLaunch && window.matchMedia) data.customization.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
data.profile.activities = data.profile.activities || (data.onboarded ? [data.profile.activity] : []);
data.profile.objections = data.profile.objections || (data.onboarded && data.profile.objection ? [data.profile.objection] : []);
data.profile.scheduleByDay = data.profile.scheduleByDay || {};
data.profile.time = data.profile.time || data.session.time || '19:00';
data.profile.days = selectedDaysForFrequency(data.profile.frequency, data.profile.days);
data.profile.routines = data.profile.routines || [{ id: 'main', activity: data.profile.activity, days: data.profile.days, time: data.profile.time, duration: data.profile.duration, location: data.profile.location, commuteTime: data.profile.commuteTime, transport: data.profile.transport, active: data.profile.activeSchedule }];
data.session.rescueOpportunity = Boolean(data.session.rescueOpportunity);
data.session.rescued = Boolean(data.session.rescued);
data.session.journey = data.session.journey || {};
data.session.confirmed = Boolean(data.session.confirmed);
let currentView = data.onboarded ? 'home' : 'onboarding';
if (data.authenticated && location.hash === '#chat') currentView = 'chat';
let onboardingStep = 0;
let notificationTimers = [];
let currentMotivation;
let mapInstance;
let userMarker;
let locationWatcher;
let socialRealtime;
let liveTimer;
let tripTimer;
let tripState = { startedAt: null, lastPosition: null, distanceMeters: 0, speedKmh: 0 };
let deferredInstallPrompt;
let backendConversationId;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; render(); });
window.addEventListener('appinstalled', () => {
  if (!data.rewards.installed) {
    data.rewards.installed = true;
    awardPoints(10, 'app instalado');
    showAppNotification('Companheiro instalado', { body: 'Bora treinar? Seu Companheiro chegou.', tag: 'companheiro-installed', silent: false, vibrate: [180, 80, 180], data: { type: 'companheiro-notification', key: 'installed', text: 'Bora treinar? Seu Companheiro chegou.' } });
  }
  toast('App instalado. Personalize seu Companheiro no Perfil.');
});
window.addEventListener('online', () => { if (currentView !== 'login') render(); });
window.addEventListener('offline', () => { if (currentView !== 'login') render(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', event => { if (event.data?.type !== 'notification-opened') return; trackEvent('NOTIFICATION_OPENED', { type: event.data.key }); if (event.data.key === 'PICKUP_EVENT_CREATED') { currentView = 'map'; render(); return; } currentView = 'chat'; render(); if (event.data.text) window.setTimeout(() => playHumanMotivation(event.data.text), 120); });

function load() {
  try { return { ...initialData, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; } catch { return initialData; }
}
function speakWelcome(name) {
  // Silencioso de proposito: isso toca assim que a pessoa entra (as vezes
  // ainda na primeira tela do onboarding, antes de ela ter feito qualquer
  // coisa) -- um toast "Reproduzindo motivacao" aparecendo do nada por cima
  // do onboarding parecia um bug visual solto na tela, entao a fala continua
  // mas sem a notificacao textual.
  playHumanMotivation(`Oi, ${name}. Eu sou seu Companheiro. Vou estar com você nos dias bons e nos dias difíceis. Hoje a gente só precisa dar um pequeno passo.`, true);
}
let googleClientId = null;
async function loadGoogleClientId() {
  try {
    const result = await apiRequest('/api/auth/google-client-id');
    googleClientId = result?.clientId || null;
    if (googleClientId && !data.authenticated) render();
  } catch { /* Sem backend disponível: o botão do Google simplesmente não aparece. */ }
}
function renderGoogleSignInButton() {
  const container = document.querySelector('#google-signin-button');
  if (!container || !googleClientId || !window.google?.accounts?.id) return;
  google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'pt-BR' });
}
function finishAuth(result, fallbackName) {
  if (result?.token) localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  if (result?.user?.id) data.userId = result.user.id;
  data.authenticated = true;
  data.profile.name = result?.user?.name || fallbackName;
  data.profile.email = result?.user?.email || data.profile.email;
  data.messages[0] = { from: 'app', text: `Oi, ${data.profile.name}. Hoje tem treino. Vamos começar juntos?` };
  awardPoints(5, 'primeiro acesso');
  currentView = data.onboarded ? 'home' : 'onboarding';
  save(); render(); speakWelcome(data.profile.name);
  if (data.onboarded) refreshOpeningGreeting();
}
async function handleGoogleCredential(response) {
  try {
    const result = await apiRequest('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: response.credential }) });
    finishAuth(result, result?.user?.name || 'Você');
  } catch {
    toast('Não foi possível entrar com o Google agora');
  }
}
async function shareMoment(text) {
  if (navigator.share) { try { await navigator.share({ title: 'Companheiro', text }); return; } catch { return; } }
  // O WebView do app nativo nao implementa navigator.share nem
  // navigator.clipboard de forma confiavel -- o botao "Convidar amigos"
  // so mostrava "Nao foi possivel compartilhar agora" sem alternativa
  // nenhuma. O link do WhatsApp e o mesmo mecanismo ja usado no botao
  // "Compartilhar motivacao" (que funciona), entao vira o fallback real
  // em vez de depender de uma API que nao existe nesse WebView.
  try { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); }
  catch { toast('Não foi possível compartilhar agora'); }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
async function apiRequest(path, options = {}) { if (!API_ORIGIN) return null; const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }; const token = localStorage.getItem(AUTH_TOKEN_KEY); if (token) headers.Authorization = `Bearer ${token}`; const response = await fetch(`${API_ORIGIN}${path}`, { ...options, headers }); if (!response.ok) throw new Error(`api_${response.status}`); return response.status === 204 ? null : response.json(); }
const COMMUNITY_LIVE_VIEWS = ['community', 'connectionChat', 'home', 'today'];
function connectSocialRealtime() {
  if (!API_ORIGIN || !data.authenticated || socialRealtime) return;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && !data.userId) apiRequest('/api/me').then(me => { if (me?.user?.id) { data.userId = me.user.id; save(); } }).catch(() => {});
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  socialRealtime = new EventSource(`${API_ORIGIN}/api/realtime${query}`);
  socialRealtime.addEventListener('feed-updated', async () => { try { const posts = await apiRequest('/api/social/feed'); if (posts?.length) { data.community.posts = posts; save(); if (currentView === 'home') render(); } } catch { /* Local feed remains available when realtime is offline. */ } });
  socialRealtime.addEventListener('connection-request', event => { const payload = JSON.parse(event.data); toast(`${payload.from.name} quer treinar com você`); loadCommunityData(); });
  socialRealtime.addEventListener('connection-accepted', event => { const payload = JSON.parse(event.data); toast(`${payload.by.name} aceitou seu convite. Bora treinar juntos!`); loadCommunityData(); });
  socialRealtime.addEventListener('connection-declined', () => loadCommunityData());
  socialRealtime.addEventListener('presence-changed', event => { const payload = JSON.parse(event.data); data.community.presence = data.community.presence || {}; data.community.presence[payload.userId] = { activity: payload.activity, status: payload.status, at: Date.now() }; if (COMMUNITY_LIVE_VIEWS.includes(currentView)) render(); });
  socialRealtime.addEventListener('room-pulse', event => { const payload = JSON.parse(event.data); const pulse = { ...payload, id: `pulse-${Date.now()}-${Math.random().toString(36).slice(2)}`, at: Date.now() }; data.community.pulses = [pulse, ...(data.community.pulses || [])].slice(0, 5); if (COMMUNITY_LIVE_VIEWS.includes(currentView)) render(); window.setTimeout(() => { data.community.pulses = (data.community.pulses || []).filter(item => item.id !== pulse.id); if (COMMUNITY_LIVE_VIEWS.includes(currentView)) render(); }, 20000); });
  socialRealtime.addEventListener('dm-received', event => { const payload = JSON.parse(event.data); const list = data.community.messages[payload.connection_id] = data.community.messages[payload.connection_id] || []; list.push(payload); save(); if (currentView === 'connectionChat' && data.community.activeChat === payload.connection_id) render(); else toast(`${payload.sender.name}: ${payload.text}`); });
  socialRealtime.addEventListener('pickup-event-message', event => { const payload = JSON.parse(event.data); const list = data.community.pickupEventMessages[payload.event_id] = data.community.pickupEventMessages[payload.event_id] || []; list.push(payload); save(); if (currentView === 'pickupEventChat' && data.community.activePickupEventChat === payload.event_id) render(); else toast(`${payload.sender.name} (jogo): ${payload.text}`); });
  socialRealtime.addEventListener('live-location-updated', event => { const payload = JSON.parse(event.data); liveLocationPeers = liveLocationPeers.filter(item => item.user_id !== payload.userId); liveLocationPeers.push({ user_id: payload.userId, name: payload.name, activity: payload.activity, lat: payload.lat, lng: payload.lng, expires_at: payload.expiresAt }); if (currentView === 'map') render(); });
  socialRealtime.addEventListener('live-location-removed', event => { const payload = JSON.parse(event.data); liveLocationPeers = liveLocationPeers.filter(item => item.user_id !== payload.userId); if (currentView === 'map') render(); });
  socialRealtime.addEventListener('pickup-event-created', () => { if (currentView === 'map') loadPickupEvents(); });
  socialRealtime.addEventListener('pickup-event-updated', () => { if (currentView === 'map') loadPickupEvents(); });
  socialRealtime.addEventListener('pickup-event-cancelled', () => { if (currentView === 'map') loadPickupEvents(); });
  socialRealtime.onerror = () => { socialRealtime?.close(); socialRealtime = null; window.setTimeout(connectSocialRealtime, 5000); };
}
async function loadCommunityData() {
  try {
    const [people, connections] = await Promise.all([apiRequest('/api/community/people'), apiRequest('/api/connections')]);
    if (people) data.community.people = people;
    if (connections) data.community.connections = connections;
    save();
    if (['community', 'home'].includes(currentView)) render();
  } catch { /* Offline: mantém o que já tinha carregado. */ }
}
async function sendConnectionRequest(userId) {
  try { await apiRequest('/api/connections', { method: 'POST', body: JSON.stringify({ user_id: userId }) }); toast('Convite enviado'); await loadCommunityData(); }
  catch { toast('Não foi possível enviar agora'); }
}
async function respondConnectionRequest(connectionId, accept) {
  try { await apiRequest(`/api/connections/${connectionId}/respond`, { method: 'PATCH', body: JSON.stringify({ accept }) }); toast(accept ? 'Conexão aceita' : 'Convite recusado'); await loadCommunityData(); }
  catch { toast('Não foi possível responder agora'); }
}
async function openConnectionChat(connectionId) {
  data.community.activeChat = connectionId;
  currentView = 'connectionChat';
  if (!data.community.messages[connectionId]) {
    try { data.community.messages[connectionId] = (await apiRequest(`/api/connections/${connectionId}/messages`)) || []; }
    catch { data.community.messages[connectionId] = data.community.messages[connectionId] || []; }
  }
  render();
}
async function sendConnectionMessage(connectionId, text) {
  const optimistic = { id: `local-${Date.now()}`, connection_id: connectionId, text, sender_id: data.userId || 'me', created_at: new Date().toISOString() };
  data.community.messages[connectionId] = [...(data.community.messages[connectionId] || []), optimistic];
  save(); render();
  try { await apiRequest(`/api/connections/${connectionId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }); }
  catch { toast('Mensagem salva neste aparelho, sem conexão agora'); }
}
async function openPickupEventChat(eventId) {
  data.community.activePickupEventChat = eventId;
  currentView = 'pickupEventChat';
  if (!data.community.pickupEventMessages[eventId]) {
    try { data.community.pickupEventMessages[eventId] = (await apiRequest(`/api/pickup-events/${eventId}/messages`)) || []; }
    catch { data.community.pickupEventMessages[eventId] = data.community.pickupEventMessages[eventId] || []; }
  }
  render();
}
async function sendPickupEventMessage(eventId, text) {
  const optimistic = { id: `local-${Date.now()}`, event_id: eventId, text, sender_id: data.userId || 'me', created_at: new Date().toISOString() };
  data.community.pickupEventMessages[eventId] = [...(data.community.pickupEventMessages[eventId] || []), optimistic];
  save(); render();
  try { await apiRequest(`/api/pickup-events/${eventId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }); }
  catch { toast('Mensagem salva neste aparelho, sem conexão agora'); }
}
async function apiAudioRequest(path, options = {}) { if (!API_ORIGIN) throw new Error('api_unavailable'); const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }; const token = localStorage.getItem(AUTH_TOKEN_KEY); if (token) headers.Authorization = `Bearer ${token}`; const response = await fetch(`${API_ORIGIN}${path}`, { ...options, headers }); if (!response.ok) throw new Error(`api_${response.status}`); return response.blob(); }
async function syncProfileWithBackend() { try { await apiRequest('/api/profile', { method: 'PUT', body: JSON.stringify({ activity: data.profile.activity, activities: data.profile.activities, frequency: data.profile.frequency, days: data.profile.days, time: data.profile.time, duration: data.profile.duration, location: data.profile.location, commuteTime: data.profile.commuteTime, transport: data.profile.transport, routines: data.profile.routines, goal: data.profile.goal, motivation: data.profile.motivation, personalizedMotivation: data.profile.personalizedMotivation, difficulty: data.profile.difficulty, objections: data.profile.objections, objection: data.profile.objection, disciplineLevel: data.profile.disciplineLevel, workStatus: data.profile.workStatus, studyStatus: data.profile.studyStatus, hasChildren: data.profile.hasChildren, notifications_enabled: Boolean(data.profile.notificationsEnabled) }) }); } catch { toast('Modo offline: perfil salvo neste aparelho'); } }
async function syncFirstSessionWithBackend() { if (!data.session.backendId) { try { const result = await apiRequest('/api/sessions', { method: 'POST', body: JSON.stringify({ activity: data.session.activity, scheduled_at: `${todayKey()}T${data.session.time}:00`, status: 'PENDING' }) }); data.session.backendId = result.id; save(); } catch { /* Offline mode keeps the local session available. */ } } }
async function syncMessageToBackend(from, text) { try { if (!backendConversationId) { const conversation = await apiRequest('/api/conversations', { method: 'POST', body: JSON.stringify({ training_session_id: data.session.backendId || null }) }); backendConversationId = conversation.id; } await apiRequest(`/api/conversations/${backendConversationId}/messages`, { method: 'POST', body: JSON.stringify({ sender_type: from === 'user' ? 'USER' : 'APP', message: text, message_type: 'TEXT', ai_generated: from === 'app' }) }); } catch { /* Offline mode keeps the conversation in local storage. */ } }
async function syncFeedbackToBackend(feedback) { if (!data.session.backendId) return; try { await apiRequest('/api/feedback', { method: 'POST', body: JSON.stringify({ training_session_id: data.session.backendId, ...feedback }) }); } catch { /* Offline mode keeps feedback locally. */ } }
async function syncSessionStatusWithBackend() { if (!data.session.backendId) return; try { await apiRequest(`/api/sessions/${data.session.backendId}`, { method: 'PATCH', body: JSON.stringify({ status: data.session.status, rescue_opportunity: Boolean(data.session.rescueOpportunity), rescued: Boolean(data.session.rescued) }) }); } catch { /* Offline mode keeps the local state authoritative. */ } }
function trackEvent(eventName, metadata = {}) { data.analytics.events.push({ event_name: eventName, metadata, created_at: new Date().toISOString() }); save(); }
function createFirstSession() { if (data.session.created) return; data.session.created = true; data.session.activity = data.profile.activity; data.session.time = data.profile.time; data.session.date = new Date().toISOString(); trackEvent('TRAINING_CREATED', { source: 'onboarding' }); syncProfileWithBackend(); syncFirstSessionWithBackend(); }
function toast(text) { const el = document.querySelector('.toast'); if (!el) return; el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function applyCustomization() {
  const root = document.documentElement;
  root.dataset.theme = data.customization.theme === 'dark' ? 'dark' : 'light';
  root.dataset.accent = data.customization.accent || 'green';
  root.dataset.sport = sportKey(data.profile.activity);
  document.title = data.customization.appName || 'Companheiro';
}
function icon(name) { const paths = { home: '<path d="m4 10 8-6 8 6v10H4Z"/><path d="M9 20v-6h6v6"/>', today: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1Z"/>', routine: '<path d="M5 5h14M5 12h9M5 19h5"/><path d="M18 15v6M15 18h6"/>', map: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', community: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="3"/><path d="M17 11a3 3 0 1 0-1.2-5.75M20 20v-1.5a4 4 0 0 0-2.5-3.7"/>', history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>', profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>', back: '<path d="M19 12H5m6-6-6 6 6 6"/>', send: '<path d="m4 12 16-8-5 16-3-6-8-2Z"/><path d="m12 14 3-3"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>' }; return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || '<circle cx="12" cy="12" r="3"/>'}</svg>`; }
function levelInfo() {
  const level = Math.floor(data.rewards.points / 100) + 1;
  return { level, progress: data.rewards.points % 100, next: level * 100 };
}
function awardPoints(amount, reason) {
  data.rewards.points += amount;
  const thresholds = [{ points: 20, badge: 'Primeiro passo' }, { points: 100, badge: 'Presença' }, { points: 250, badge: 'Constância' }];
  thresholds.forEach(item => { if (data.rewards.points >= item.points && !data.rewards.badges.includes(item.badge)) data.rewards.badges.push(item.badge); });
  save(); toast(`+${amount} pontos · ${reason}`);
}
function analyzeMessage(text) {
  const lower = text.toLowerCase();
  const rules = [
    { objection: 'dor', keywords: ['dor', 'lesão', 'machuquei', 'mal-estar', 'não estou bem'], intent: 'safety' },
    { objection: 'frio', keywords: ['está frio', 'tá frio', 'fazendo frio'], intent: 'resistance' },
    { objection: 'chuva', keywords: ['chuva', 'chovendo'], intent: 'constraint' },
    { objection: 'filhos', keywords: ['meu filho', 'minha filha', 'meus filhos'], intent: 'constraint' },
    { objection: 'cansaço', keywords: ['cansado', 'exausto', 'sem energia'], intent: 'resistance' },
    { objection: 'falta de vontade', keywords: ['sem vontade', 'preguiça', 'desanimado'], intent: 'resistance' },
    { objection: 'falta de tempo', keywords: ['sem tempo', 'atrasado', 'trabalho'], intent: 'constraint' },
    { objection: 'preparação', keywords: ['vou me preparar', 'roupa', 'tênis'], intent: 'commitment' },
    { objection: 'saída', keywords: ['já saí', 'estou indo', 'na rua'], intent: 'commitment' },
    { objection: 'companhia', keywords: ['não quero correr sozinho', 'não quero correr sozinha', 'sem companhia', 'correr com alguém', 'treinar com alguém'], intent: 'community' }
  ];
  const match = rules.find(rule => rule.keywords.some(keyword => lower.includes(keyword)));
  return match ? { ...match, confidence: 0.92 } : { objection: null, intent: 'open', confidence: 0.46 };
}
const OBJECTION_BACKEND_NAMES = { 'dor': 'Dor', 'frio': 'Frio', 'chuva': 'Chuva', 'filhos': 'Filhos', 'cansaço': 'Cansaço', 'falta de vontade': 'Falta de vontade', 'falta de tempo': 'Falta de tempo', 'companhia': 'Falta de companhia' };
function syncObjectionWithBackend(objection) {
  const name = OBJECTION_BACKEND_NAMES[objection];
  if (!name) return;
  apiRequest('/api/objections', { method: 'POST', body: JSON.stringify({ name }) }).catch(() => { /* Offline mode keeps the local tally authoritative. */ });
}
function rememberMessage(text) {
  const analysis = analyzeMessage(text);
  data.memory.lastIntent = analysis.intent;
  if (analysis.objection) { data.memory.lastObjection = analysis.objection; data.memory.objections[analysis.objection] = (data.memory.objections[analysis.objection] || 0) + 1; }
  if (['safety', 'resistance', 'constraint', 'community'].includes(analysis.intent) && analysis.objection) syncObjectionWithBackend(analysis.objection);
  if (['resistance', 'constraint'].includes(analysis.intent) && !data.session.rescueOpportunity) { data.session.rescueOpportunity = true; data.analytics.rescueOpportunities += 1; }
  save();
  return analysis;
}
function rescueRate() { if (!data.analytics.rescueOpportunities) return 0; return Math.round((data.analytics.rescues / data.analytics.rescueOpportunities) * 100); }
function safeCompanionResponse(response) {
  const normalized = String(response || '').trim();
  if (!normalized || GUILT_PHRASES.some(phrase => normalized.toLowerCase().includes(phrase))) return fallbackResponse('');
  return normalized;
}
function buildMotivation(seed = Math.random()) {
  const { activity, objection, goal, difficulty } = data.profile;
  const activities = data.profile.activities || [activity];
  const sportPhrases = activities.flatMap(item => sportMotivations[item] || []);
  const contextualPhrases = [
    `Hoje é um bom dia para cuidar de você. Só comece com cinco minutos de ${activity.toLowerCase()}.`,
    `Você não precisa vencer o treino inteiro agora. Só precisa vencer o primeiro passo.`,
    `Mesmo com ${objection.toLowerCase()}, ainda dá para escolher uma versão possível do seu treino.`,
    `Eu lembro que sua dificuldade é ${difficulty.toLowerCase()}. Hoje vamos cuidar só do próximo passo.`,
    `Seu motivo importa: ${goal.toLowerCase()}. Vamos fazer algo pequeno por ele hoje.`,
    'Não espere a vontade chegar. Comece devagar e deixe o movimento trazer o resto.',
    'Você já fez algo importante: decidiu não desistir de você hoje.',
    ...motivationalPhrases,
    ...sportPhrases
  ];
  return contextualPhrases[Math.floor(seed * contextualPhrases.length) % contextualPhrases.length];
}
function dailyMotivation() { const daySeed = new Date().getFullYear() * 366 + new Date().getMonth() * 31 + new Date().getDate(); return buildMotivation((daySeed % 1000) / 1000); }
function motivationText() { if (!currentMotivation) currentMotivation = dailyMotivation(); return currentMotivation; }
function refreshMotivation() { currentMotivation = buildMotivation(); render(); toast('Nova motivação pronta'); }
function speakMotivation(text = motivationText(), silent = false) {
  if (!('speechSynthesis' in window)) { if (!silent) toast('Áudio não suportado neste aparelho'); return; }
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('pt-br'));
  if (voice) speech.voice = voice;
  speech.lang = 'pt-BR'; speech.rate = 0.9; speech.pitch = 1.02;
  window.speechSynthesis.speak(speech); if (!silent) toast('Reproduzindo motivação');
}
async function playHumanMotivation(text = motivationText(), silent = false) {
  if (!HUMAN_AUDIO_ENDPOINT) { speakMotivation(text, silent); return; }
  try {
    const audioBlob = await apiAudioRequest('/api/motivation-audio', { method: 'POST', body: JSON.stringify({ text, language: 'pt-BR', voice: data.profile.voicePreference || 'coral' }) });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl); await audio.play(); if (!silent) toast('Áudio com voz humana');
  } catch { speakMotivation(text, silent); }
}
async function showAppNotification(title, options) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
  } catch { /* Fall back to a foreground notification when the worker is unavailable. */ }
  new Notification(title, options);
}
function clearNotificationTimers() {
  notificationTimers.forEach(timer => window.clearTimeout(timer));
  notificationTimers = [];
}
function notificationStorageKey(item) {
  const sessionKey = data.session.backendId || data.session.date || data.session.activity;
  return `companheiro-notification:${sessionKey}:${todayKey()}:${item.key}`;
}
function notificationAlreadySent(item) { return localStorage.getItem(notificationStorageKey(item)) === 'sent'; }
function notificationBody(item) {
  const activity = data.profile.activity;
  return item.key === 'T_MINUS_60' ? `Bora treinar, ${data.profile.name}? Hoje tem ${activity}.` : item.key === 'T_MINUS_45' ? 'Roupa separada?' : item.key === 'T_MINUS_30' ? 'O que está te segurando?' : item.key === 'T_MINUS_20' ? 'Só coloca a roupa e o tênis. Depois você decide o próximo passo.' : 'E aí, você foi?';
}
function notificationPlan() {
  const postOffset = Math.max(20, (Number(data.profile.duration) || 45) + 10);
  return [{ key: 'T_MINUS_60', offset: -60, title: 'Bora treinar?' }, { key: 'T_MINUS_45', offset: -45, title: 'Vamos nos preparar?' }, { key: 'T_MINUS_30', offset: -30, title: 'Estou com você' }, { key: 'T_MINUS_20', offset: -20, title: 'Só o próximo passo' }, { key: 'POST_TRAINING', offset: postOffset, title: 'Depois do treino' }];
}
function notificationCanRun(item) {
  const finalStates = ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'];
  if (!data.profile.notificationsEnabled || finalStates.includes(data.session.status)) return false;
  if (data.session.confirmed || data.session.status === 'LEFT') return item.key === 'POST_TRAINING';
  return true;
}
async function dispatchScheduledNotification(item) {
  if (!notificationCanRun(item) || notificationAlreadySent(item)) return;
  localStorage.setItem(notificationStorageKey(item), 'sent');
  const text = notificationBody(item);
  await showAppNotification(item.title, { body: text, tag: `companheiro-${item.key.toLowerCase()}`, renotify: false, silent: false, vibrate: [180, 80, 180], data: { type: 'companheiro-notification', key: item.key, text } });
  trackEvent('NOTIFICATION_SENT', { type: item.key });
  if (document.visibilityState === 'visible') window.setTimeout(() => playHumanMotivation(text), 0);
}
function scheduleTrainingNotifications() {
  clearNotificationTimers();
  if (!('Notification' in window) || Notification.permission !== 'granted' || !data.profile.notificationsEnabled) return;
  const trainingTime = trainingDate();
  notificationPlan().forEach(item => {
    const triggerAt = new Date(trainingTime.getTime() + item.offset * 60 * 1000);
    const delay = triggerAt.getTime() - Date.now();
    if (delay <= 0 || !notificationCanRun(item)) return;
    notificationTimers.push(window.setTimeout(() => dispatchScheduledNotification(item), delay));
  });
}
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !API_ORIGIN) return;
  try {
    const { publicKey } = await apiRequest('/api/push/public-key');
    if (!publicKey) return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await apiRequest('/api/devices', { method: 'POST', body: JSON.stringify({ device_token: JSON.stringify(subscription), platform: 'WEB' }) });
  } catch { /* Sem push real, o app continua funcionando com o reforço local em primeiro plano. */ }
}
async function enableNotifications() {
  if (!('Notification' in window)) {
    // Dentro do app nativo (WebView) essa API do navegador nao existe --
    // isso NAO e um bug, e uma limitacao do Android. O lembrete de treino ja
    // funciona nativo (fora dessa tela); os outros avisos (meta semanal, jogo
    // marcado) so chegam abrindo o site pelo Chrome por enquanto.
    toast(nativeBluetoothSupported
      ? 'Esse tipo de aviso não funciona dentro do app -- o lembrete de treino já chega por fora. Pra outros avisos, abra o site pelo Chrome.'
      : 'Notificações não suportadas neste navegador');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') { toast('Permissão de notificação não concedida'); return; }
  data.profile.notificationsEnabled = true;
  save();
  syncProfileWithBackend();
  await subscribeToPush();
  const welcome = 'Bora treinar?';
  await showAppNotification('Companheiro ativado', { body: welcome, tag: 'companheiro-enabled', silent: false, vibrate: [180, 80, 180], data: { type: 'companheiro-notification', key: 'enabled', text: welcome } });
  scheduleTrainingNotifications();
  playHumanMotivation(welcome);
  toast('Notificações ativadas');
}

function reportRenderError(view, error) {
  // console.error aqui (alem do POST pro servidor) e o que faz o app nativo
  // Android mostrar um toast com o erro na hora -- sem isso, um erro sem
  // tratamento nao passava pelo onConsoleMessage do WebView, so ficava
  // guardado no servidor esperando alguem navegar ate o painel de eventos.
  console.error(`[${view}] ${String(error?.message || error)}`);
  try { apiRequest('/api/events', { method: 'POST', body: JSON.stringify({ event_name: 'WEB_RENDER_ERROR', metadata: { view, message: String(error?.message || error), stack: String(error?.stack || '').slice(0, 500) } }) }).catch(() => {}); } catch { /* Sem conexao: segue sem reportar. */ }
}
function render() {
  try {
    renderInner();
  } catch (error) {
    // Sem essa rede de seguranca, um erro em qualquer tela (por exemplo um
    // dado que ainda nao carregou) trava a troca de tela silenciosamente --
    // a pessoa toca e "nao acontece nada", porque o innerHTML nunca chega a
    // ser atualizado. Agora a gente registra o erro (pra investigar de
    // verdade depois) e volta pra Home em vez de deixar a tela presa.
    console.error('Erro ao renderizar', currentView, error);
    reportRenderError(currentView, error);
    if (currentView !== 'home') { currentView = 'home'; render(); }
    else toast('Algo deu errado. Tente novamente em alguns segundos.');
  }
}
function renderInner() {
  applyCustomization();
  connectSocialRealtime();
  if (data.profile.notificationsEnabled) scheduleTrainingNotifications(); else clearNotificationTimers();
  if (!data.authenticated) {
    app.innerHTML = renderLoginV2();
    bindEvents();
    renderGoogleSignInButton();
    return;
  }
  if (currentView === 'summary') createFirstSession();
  if (currentView === 'onboarding') {
    app.innerHTML = renderOnboarding();
    bindEvents();
    return;
  }
  const views = { home: renderFeed, summary: renderSummaryV3, today: renderToday, routine: renderRoutineV3, history: renderHistoryV2, profile: renderProfile, customize: renderCustomizeV2, admin: renderAdmin, chat: renderChatV2, map: renderMap, community: renderCommunity, connectionChat: renderConnectionChat, pickupEventChat: renderPickupEventChat };
  if (['community', 'home'].includes(currentView)) {
    if (!communityDataLoaded) { communityDataLoaded = true; loadCommunityData(); loadPickupEvents(); }
  } else {
    communityDataLoaded = false;
  }
  app.innerHTML = views[currentView]();
  if (!['chat', 'summary', 'connectionChat', 'pickupEventChat'].includes(currentView)) app.innerHTML += renderNavMvp();
  bindEvents();
  if (currentView === 'map') {
    window.setTimeout(initMeetingMap, 0);
    if (!mapPeersLoaded) { mapPeersLoaded = true; loadLiveLocationPeers(); loadPickupEvents(); loadNearbyPlaces(); }
  } else {
    mapPeersLoaded = false;
  }
  if (['today', 'chat'].includes(currentView)) startLiveClock(); else window.clearInterval(liveTimer);
}
function renderLoginV2() {
  return `<section class="screen login-screen"><div class="brand-row"><div class="logo"><span class="logo-mark">✦</span> companheiro</div><span class="offline-badge">${navigator.onLine ? 'online' : 'offline pronto'}</span></div><div class="login-hero"><div class="hero-shape hero-shape-live"></div><div class="eyebrow">SEU COMPANHEIRO DIARIO</div><h1>Como posso chamar voce?</h1><p class="lead">Eu vou lembrar do que voce gosta e estar por perto quando comecar parecer dificil.</p><form id="login-form" class="login-form"><label class="field-label" for="user-name">Seu nome</label><input id="user-name" name="name" class="text-input" placeholder="Digite seu nome" autocomplete="name" required /><label class="field-label" for="user-email">E-mail</label><input id="user-email" name="email" class="text-input" type="email" placeholder="voce@exemplo.com" autocomplete="email" required /><label class="field-label" for="user-password">Senha</label><input id="user-password" name="password" class="text-input" type="password" minlength="8" placeholder="Minimo de 8 caracteres" autocomplete="new-password" required /><button class="primary" type="submit">Criar meu espaco <span>→</span></button></form>${googleClientId ? '<div class="login-divider"><span>ou</span></div><div id="google-signin-button" class="google-signin-container"></div>' : ''}<p class="login-tagline">Seu companheiro de treino, todos os dias.</p><button type="button" class="text-action guest-entry-button" data-guest-entry>Só quero conhecer o app agora</button></div><p class="login-note">Seus dados ficam protegidos e o app continua funcionando sem internet.</p></section>`;
}

function renderOnboarding() {
  const steps = [
    { title: 'Vamos cuidar da sua disciplina?', text: 'Eu não estou aqui apenas para lembrar você de treinar. Quero ajudar justamente nos dias em que sua vontade de desistir aparecer.', options: [] },
    { title: 'Qual atividade você pratica?', text: 'Escolha a principal agora. Você poderá adicionar outras modalidades depois.', options: ['Academia', 'Corrida', 'Caminhada', 'Natação', 'Ciclismo', 'Crossfit', 'Dança', 'Outra'] },
    { title: 'Quando costuma treinar?', text: 'Um horário simples já ajuda a criar o primeiro compromisso.', options: [] },
    { title: 'O que costuma te segurar?', text: 'Pode escolher mais de uma. Isso ajuda o Companheiro a entender você.', options: ['Cansaço', 'Preguiça', 'Falta de tempo', 'Trabalho', 'Filhos', 'Frio', 'Chuva', 'Falta de vontade', 'Desânimo', 'Não vejo resultado', 'Falta de companhia', 'Vergonha', 'Dor', 'Outro'] },
    { title: 'Só mais alguns detalhes', text: 'Sem digitar nada — é só escolher o que mais combina com você.', options: [] }
  ][onboardingStep];
  if (onboardingStep === 1) steps.options = sportCatalog;
  const selected = onboardingStep === 1 ? (data.profile.activities || [data.profile.activity]) : onboardingStep === 3 ? (data.profile.objections || []) : data.profile.objection;
  return `<section class="screen onboarding">
    <div><div class="brand-row"><div class="logo"><span class="logo-mark">✦</span> companheiro</div><span class="small">${onboardingStep + 1}/5</span></div>
    <div class="progress"><span style="width:${((onboardingStep + 1) / 5) * 100}%"></span></div>
    <div class="hero">${onboardingStep === 0 ? '<div class="hero-shape hero-shape-live"></div>' : ''}<h1>${steps.title}</h1><p class="lead">${steps.text}</p></div>
    ${steps.options.length ? `<div class="choice-grid">${steps.options.map(option => `<button class="choice ${selected.includes(option) ? 'selected' : ''}" data-onboard-choice="${option}">${option}</button>`).join('')}</div>` : ''}
    ${onboardingStep === 2 ? `<div class="form-block"><label class="field-label" for="frequency">Quantas vezes por semana?</label><select id="frequency" class="text-input"><option value="1" ${data.profile.frequency === 1 ? 'selected' : ''}>1 vez</option><option value="2" ${data.profile.frequency === 2 ? 'selected' : ''}>2 vezes</option><option value="3" ${data.profile.frequency === 3 ? 'selected' : ''}>3 vezes</option><option value="4" ${data.profile.frequency === 4 ? 'selected' : ''}>4 vezes</option><option value="5" ${data.profile.frequency === 5 ? 'selected' : ''}>5 vezes</option><option value="6" ${data.profile.frequency === 6 ? 'selected' : ''}>6 vezes</option><option value="7" ${data.profile.frequency === 7 ? 'selected' : ''}>Todos os dias</option></select><span class="field-label days-label">Em quais dias você normalmente pratica?</span><div class="days-grid">${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(day => `<label class="day-check"><input type="checkbox" name="training-days" value="${day}" ${(data.profile.days || []).includes(day) ? 'checked' : ''} /><span>${day}</span></label>`).join('')}</div><label class="field-label" for="training-time">Horário normalmente</label><input id="training-time" class="time-input" type="time" value="${data.profile.time}" /><label class="field-label" for="training-duration">Duração aproximada</label><input id="training-duration" class="text-input" type="number" min="5" max="240" value="${data.profile.duration}" placeholder="minutos" /><label class="field-label" for="commute-time">Quanto leva para chegar?</label><select id="commute-time" class="text-input"><option>Não informado</option><option>Menos de 10 minutos</option><option>10–20 minutos</option><option>20–30 minutos</option><option>30–60 minutos</option><option>Mais de 1 hora</option></select><label class="field-label" for="transport">Como você chega?</label><select id="transport" class="text-input"><option>Não informado</option><option>A pé</option><option>Carro</option><option>Ônibus</option><option>Metrô/trem</option><option>Bicicleta</option><option>Outro</option></select></div>` : ''}
    ${onboardingStep === 4 ? `<div class="form-block"><label class="field-label" for="motivation">Por que você quer praticar?</label><select id="motivation" class="text-input"><option>Melhorar minha saúde</option><option>Emagrecer</option><option>Melhorar minha autoestima</option><option>Ter mais disposição</option><option>Cuidar de mim</option><option>Melhorar minha aparência</option><option>Acompanhar meus filhos</option><option>Envelhecer melhor</option><option>Melhorar meu desempenho</option><option>Realizar um sonho</option><option>Outro</option></select><label class="field-label" for="discipline-level">Qual frase mais parece com você?</label><select id="discipline-level" class="text-input"><option>Estou começando agora.</option><option>Eu até consigo manter uma rotina.</option><option>Sou bastante disciplinado.</option><option>Eu começo, paro e começo de novo.</option></select><label class="field-label" for="work-status">Você trabalha?</label><select id="work-status" class="text-input"><option>Não informado</option><option>Sim</option><option>Não</option></select><label class="field-label" for="study-status">Você estuda?</label><select id="study-status" class="text-input"><option>Não informado</option><option>Sim</option><option>Não</option></select><label class="field-label" for="has-children">Você tem filhos?</label><select id="has-children" class="text-input"><option>Não informado</option><option>Sim</option><option>Não</option></select></div>` : ''}
    </div><div class="button-row"><button class="primary" data-onboard-next>${onboardingStep === 4 ? 'Conhecer meu app' : onboardingStep === 0 ? 'Começar' : 'Continuar'} <span>→</span></button></div>
  </section>`;
}
function renderPulseStrip() {
  const pulses = data.community.pulses || [];
  if (!pulses.length) return '';
  return `<div class="pulse-strip">${pulses.map(pulse => `<div class="pulse-chip"><span class="pulse-dot"></span>${escapeHtml(pulse.message)}</div>`).join('')}</div>`;
}
function renderPresenceStories() {
  const people = data.community.people || [];
  const presence = data.community.presence || {};
  const active = people.filter(person => presence[person.id] || person.online);
  if (!active.length) return '';
  return `<div class="story-strip">${active.map(person => `<div class="story-avatar ${presence[person.id] ? 'story-live' : ''}"><span class="story-ring">${sportIcon(person.activity || data.profile.activity)}</span><small>${escapeHtml((person.name || '?').split(' ')[0])}</small></div>`).join('')}</div>`;
}
function communityConnectButton(person) {
  const state = person.connection?.state;
  if (state === 'connected') return `<button class="partner-button partner-chat-button" data-open-chat="${person.connection.connectionId}">💬 Abrir conversa</button>`;
  if (state === 'pending_sent') return `<button class="secondary partner-button" disabled>Convite enviado</button>`;
  if (state === 'pending_received') return `<button class="primary partner-button" data-respond-connection="${person.connection.connectionId}" data-accept="true">Aceitar convite</button>`;
  return `<button class="secondary partner-button" data-connect="${person.id}">Conectar</button>`;
}
function communityPresenceBadge(person) {
  const live = (data.community.presence || {})[person.id];
  if (live) return `<span class="presence-badge presence-live"><span class="presence-dot"></span>treinando ${escapeHtml(live.activity || '')} agora</span>`;
  if (person.online) return `<span class="presence-badge presence-online"><span class="presence-dot"></span>online agora</span>`;
  return '';
}
function renderCommunity() {
  const people = data.community.people || [];
  const connections = data.community.connections || [];
  const incoming = connections.filter(item => item.status === 'PENDING' && item.direction === 'incoming');
  const accepted = connections.filter(item => item.status === 'ACCEPTED');
  return `<section class="screen community-screen">${header('Comunidade', 'COMUNIDADE')}<p class="lead">Você não precisa fazer tudo sozinho. Veja quem está treinando agora e conecte-se de verdade.</p><button class="secondary invite-friends-button" data-invite-friends>📲 Convidar amigos para treinar</button>${renderPresenceStories()}${renderPulseStrip()}${incoming.length ? `<div class="section-title"><h3>Pedidos de conexão</h3></div><div class="community-list">${incoming.map(item => `<article class="person-card request-card"><div class="person-avatar">${escapeHtml((item.user?.name || '?')[0])}</div><div class="person-main"><div class="person-line"><div><h3>${escapeHtml(item.user?.name || 'Alguém')}</h3><p class="small">quer treinar com você</p></div></div><div class="request-actions"><button class="primary" data-respond-connection="${item.id}" data-accept="true">Aceitar</button><button class="secondary" data-respond-connection="${item.id}" data-accept="false">Recusar</button></div></div></article>`).join('')}</div>` : ''}<div class="section-title"><div class="stat-line"><h3>Para seu próximo treino</h3><span class="status-pill">${escapeHtml(data.profile.activity || '')}</span></div></div><div class="community-list">${people.length ? people.map(person => `<article class="person-card"><div class="person-avatar">${sportIcon(person.activity || data.profile.activity)}</div><div class="person-main"><div class="person-line"><div><h3>${escapeHtml(person.name)}</h3><p class="small">${escapeHtml(person.activity || 'Atividade livre')}${person.time ? ' · ' + escapeHtml(person.time) : ''}</p></div>${communityPresenceBadge(person)}</div>${communityConnectButton(person)}</div></article>`).join('') : '<p class="small">Ainda não há outras pessoas cadastradas com essa atividade. Volte em breve.</p>'}</div>${accepted.length ? `<div class="section-title"><h3>Suas conexões</h3></div><div class="community-list">${accepted.map(item => `<article class="person-card"><div class="person-avatar">${escapeHtml((item.user?.name || '?')[0])}</div><div class="person-main"><div class="person-line"><div><h3>${escapeHtml(item.user?.name || 'Conexão')}</h3><p class="small">${item.online ? 'online agora' : 'offline'}</p></div></div><button class="partner-button partner-chat-button" data-open-chat="${item.id}">💬 Conversar</button></div></article>`).join('')}</div>` : ''}${renderPickupEventsSection()}<div class="community-note"><strong>Encontro seguro primeiro.</strong><span>Compartilhe só o necessário. O app não mostra seu telefone nem sua localização exata.</span></div></section>`;
}
function renderConnectionChat() {
  const connectionId = data.community.activeChat;
  const connection = (data.community.connections || []).find(item => item.id === connectionId);
  const otherName = connection?.user?.name || 'Conversa';
  const messages = data.community.messages[connectionId] || [];
  return `<section class="screen chat-wrap connection-chat-screen"><div class="chat-topline"><button class="icon-button" data-view="community" aria-label="Voltar">←</button><div class="companion-avatar">${escapeHtml(otherName[0] || '?')}</div><div><strong>${escapeHtml(otherName)}</strong><p class="small">${connection?.online ? 'online agora' : 'offline'}</p></div></div><div class="chat-messages">${messages.length ? messages.map(message => `<div class="bubble ${message.sender_id === data.userId ? 'user' : ''}">${escapeHtml(message.text)}</div>`).join('') : '<p class="small">Nenhuma mensagem ainda. Diga oi!</p>'}</div><form class="chat-form" id="connection-chat-form"><input class="text-input" id="connection-chat-input" placeholder="Escreva uma mensagem" autocomplete="off" /><button class="send" type="submit">➤</button></form></section>`;
}
function renderPickupEventChat() {
  const eventId = data.community.activePickupEventChat;
  const event = pickupEvents.find(item => item.id === eventId);
  const messages = data.community.pickupEventMessages[eventId] || [];
  return `<section class="screen chat-wrap connection-chat-screen"><div class="chat-topline"><button class="icon-button" data-view="map" aria-label="Voltar">←</button><div class="companion-avatar">${sportIcon(event?.activity)}</div><div><strong>${escapeHtml(event?.title || 'Conversa do jogo')}</strong><p class="small">${escapeHtml(event?.location_name || '')}</p></div></div><div class="chat-messages">${messages.length ? messages.map(message => `<div class="message-row ${message.sender_id === data.userId ? 'message-user' : 'message-app'}">${message.sender_id !== data.userId ? `<div class="message-avatar" aria-hidden="true">${escapeHtml((message.sender?.name || '?')[0])}</div>` : ''}<div class="bubble ${message.sender_id === data.userId ? 'user' : 'app'}">${message.sender_id !== data.userId ? `<strong class="pickup-chat-sender">${escapeHtml(message.sender?.name || 'Alguém')}</strong>` : ''}${escapeHtml(message.text)}</div></div>`).join('') : '<p class="small">Combine os detalhes do encontro por aqui. Diga oi!</p>'}</div><form class="chat-form" id="pickup-event-chat-form"><input class="text-input" id="pickup-event-chat-input" placeholder="Escreva uma mensagem" autocomplete="off" /><button class="send" type="submit">➤</button></form></section>`;
}
function header(title, kicker = 'COMPANHEIRO') { const initial = String(data.profile.name || 'C').trim().charAt(0).toUpperCase(); return `<div class="topline app-header"><div class="header-lead"><button class="icon-button drawer-trigger" type="button" data-open-drawer aria-label="Abrir modalidades">${icon('menu')}</button><div class="header-copy"><div class="eyebrow">${kicker}</div><h2>${title}</h2><span class="header-date">${currentDateLabel()}</span></div></div><div class="header-actions"><span class="offline-badge">${navigator.onLine ? 'online' : 'offline pronto'}</span><button class="profile-avatar" aria-label="Abrir perfil" data-view="profile">${initial}</button></div></div>`; }
const DRAWER_CATEGORY_COLORS = { endurance: '#f1b65c', strength: '#e2793f', flow: '#d6a6d5', combat: '#e9988b', team: '#9dce77', court: '#e5d36a', urban: '#b6b7ed', direct: '#9db8a0' };
const DRAWER_QUICK_SPORTS = ['Futebol', 'Futsal', 'Basquete', 'Vôlei', 'Tênis', 'Beach Tennis', 'Natação', 'Corrida'];
function groupedSportCatalog() {
  const groups = new Map();
  sportCatalog.forEach(sport => {
    const { tag, slug } = sportLayout(sport);
    if (!groups.has(tag)) groups.set(tag, { slug, sports: [] });
    groups.get(tag).sports.push(sport);
  });
  return groups;
}
function openSportDrawer() {
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  const groups = groupedSportCatalog();
  const groupsHtml = [...groups.entries()].map(([tag, { slug, sports }]) => { const color = DRAWER_CATEGORY_COLORS[slug] || DRAWER_CATEGORY_COLORS.direct; return `<div class="drawer-group"><span class="drawer-group-label">${escapeHtml(tag)}</span>${sports.map(sport => `<button type="button" class="drawer-item ${sport === data.profile.activity ? 'selected' : ''}" data-drawer-sport="${escapeHtml(sport)}"><span class="drawer-item-icon" style="background:${color};color:#1a2e22">${sportIcon(sport)}</span><span>${escapeHtml(sport)}</span></button>`).join('')}</div>`; }).join('');
  const quickGridHtml = DRAWER_QUICK_SPORTS.map(sport => { const color = DRAWER_CATEGORY_COLORS[sportLayout(sport).slug] || DRAWER_CATEGORY_COLORS.direct; return `<button type="button" class="drawer-quick-item ${sport === data.profile.activity ? 'selected' : ''}" data-drawer-sport="${escapeHtml(sport)}"><span class="drawer-item-icon" style="background:${color};color:#1a2e22">${sportIcon(sport)}</span><small>${escapeHtml(sport)}</small></button>`; }).join('');
  overlay.innerHTML = `<nav class="drawer-panel"><div class="drawer-header"><div><span class="eyebrow" style="color:#b9d4bf">MODALIDADES</span><strong>Escolha seu esporte</strong></div><button class="icon-button" type="button" data-drawer-close aria-label="Fechar">×</button></div><div class="drawer-quick-actions"><button type="button" class="drawer-action-button" data-drawer-map>🗺 Ver mapa</button><button type="button" class="drawer-action-button" data-drawer-create-event>+ ${escapeHtml(pickupEventTerms(data.profile.activity).verbCreate)}</button></div><div class="drawer-quick-grid">${quickGridHtml}</div><div class="drawer-search"><input type="text" class="drawer-search-input" placeholder="Buscar modalidade..." data-drawer-search /></div><div class="drawer-list">${groupsHtml}</div></nav>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  const close = () => { overlay.classList.remove('open'); window.setTimeout(() => overlay.remove(), 220); };
  overlay.querySelector('[data-drawer-close]').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelector('[data-drawer-map]').addEventListener('click', () => { close(); currentView = 'map'; render(); });
  overlay.querySelector('[data-drawer-create-event]').addEventListener('click', () => { close(); currentView = 'map'; render(); window.setTimeout(openCreatePickupEventModal, 260); });
  overlay.querySelector('[data-drawer-search]').addEventListener('input', event => {
    const query = event.currentTarget.value.trim().toLowerCase();
    overlay.querySelectorAll('.drawer-item').forEach(item => { item.hidden = !item.textContent.toLowerCase().includes(query); });
    overlay.querySelectorAll('.drawer-group').forEach(group => { group.hidden = ![...group.querySelectorAll('.drawer-item')].some(item => !item.hidden); });
  });
  overlay.querySelectorAll('[data-drawer-sport]').forEach(button => button.addEventListener('click', () => {
    const sport = button.dataset.drawerSport;
    data.profile.activity = sport;
    data.profile.activities = [...new Set([sport, ...(data.profile.activities || [])])];
    data.customization.sport = sport;
    data.customization.accent = sportAccent[sport] || data.customization.accent;
    applyCustomization();
    save();
    close();
    render();
    toast(`Modalidade ajustada para ${sport}`);
  }));
}
function renderToday() {
  const status = data.session.status;
  const completed = status === 'COMPLETED';
  const action = completed ? 'Ver meu histórico' : 'Conversar comigo';
  const level = levelInfo();
  return `<section class="screen">${header('Olá, ' + escapeHtml(data.profile.name))}
    <div class="hero-card sport-hero"><div class="hero-orbit hero-orbit-one"></div><div class="hero-orbit hero-orbit-two"></div><div class="hero-content"><div class="hero-topline"><div class="eyebrow">${completed ? 'TREINO CONCLUÍDO' : 'SEU PRÓXIMO MOMENTO'}</div><span class="hero-sport-badge">${sportIcon()} ${escapeHtml(data.profile.activity)}</span></div><h2>${completed ? 'Mais um feito.' : 'Vamos começar?'}</h2><p class="hero-subtitle">${completed ? 'Você apareceu por você hoje.' : 'Sem pensar no treino inteiro. Só o próximo passo.'}</p></div><div class="session-bottom"><div><div class="small">Seu horário</div><div class="session-time">${data.profile.time}</div></div><button class="primary" data-today-action>${action} <span>→</span></button></div></div>${completed ? '<div class="feedback-card"><p class="post-message">Sabia que você conseguiria.</p><h3>Como você se sentiu?</h3><div class="feedback-options">' + ['😀 Muito bem', '🙂 Bem', '😐 Normal', '😫 Foi difícil'].map(item => `<button data-feedback="${item}">${item}</button>`).join('') + '</div><p class="small" data-feedback-status>Mais um treino feito. Não foi sobre vontade. Foi sobre aparecer.</p><button class="secondary" style="width:100%;margin-top:12px" data-share-moment>Compartilhar essa vitória ↗</button></div>' : ''}${status === 'NOT_COMPLETED' ? '<div class="feedback-card"><p class="post-message">Tudo bem. Amanhã é uma nova oportunidade.</p><h3>Quer me contar o que aconteceu?</h3><div class="feedback-options">' + ['Cansaço', 'Falta de tempo', 'Preguiça', 'Problema pessoal', 'Não estava bem', 'Outro'].map(item => `<button data-not-completed-reason="${item}">${item}</button>`).join('') + '</div><p class="small" data-reason-status>Seu registro fica só para você.</p></div>' : ''}
    <div class="live-panel"><div class="live-panel-top"><div><div class="eyebrow">PULSO AO VIVO</div><strong data-live-status>${completed ? 'Treino concluído' : 'Conectando ao seu momento...'}</strong></div><span class="live-signal"><i></i><i></i><i></i></span></div><div class="live-time" data-live-clock>--:--:--</div><div class="live-countdown" data-live-countdown>Calculando seu próximo passo...</div><div class="workout-timer-badge" data-workout-timer-badge hidden><span class="workout-timer-dot"></span>Treino em andamento · <strong data-workout-timer>00:00</strong></div>${data.devices?.heartRateConnected ? `<div class="heart-rate-live"><span class="heart-rate-dot"></span>Frequência cardíaca · <strong data-heart-rate-live>${data.devices.heartRateBpm ? data.devices.heartRateBpm + ' bpm' : 'lendo...'}</strong></div>` : ''}</div>${renderPulseStrip()}<div class="today-actions"><button class="map-link" data-view="map">⌖ Abrir mapa ao vivo</button><button class="map-link" data-view="community">♧ Encontrar companhia</button></div>${!completed && trainingDate() <= new Date() && !['NOT_COMPLETED','CANCELLED','RESCHEDULED'].includes(status) ? '<div class="post-training-card"><h3>E aí, você foi?</h3><div class="post-training-actions"><button class="primary" data-post-training="yes">SIM</button><button class="secondary" data-post-training="no">NÃO</button></div></div>' : ''}
    <div class="section-title"><div class="stat-line"><h3>Seu próximo passo</h3><span class="status-pill status-${statusVisual(status)}"><span aria-hidden="true">${statusVisual(status) === 'success' ? '✓' : statusVisual(status) === 'attention' ? '!' : '•'}</span> ${statusLabel(status)}</span></div></div>
    ${renderModalityPanel(data.profile.activity, 'today')}
    <div class="card"><div class="routine-row"><div class="day-dot">${weekDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}</div><div><h3>${completed ? 'Sentir orgulho também conta' : 'Só os próximos cinco minutos'}</h3><p class="small">${completed ? 'Registre como foi para guardar esse momento.' : 'Roupa, tênis e porta. O resto a gente resolve depois.'}</p></div></div></div>
    <div class="section-title"><h3>Esta semana</h3></div><div class="card weekly-card"><div class="weekly-grid"><div><span class="small">treinos feitos</span><strong>${data.history.filter(item => item.status === 'COMPLETED').length}</strong></div><div><span class="small">meta semanal</span><strong>${data.profile.frequency}</strong></div><div><span class="small">resgates</span><strong>${data.analytics.rescues}</strong></div></div>${renderWeeklyChart()}<p class="weekly-note">A presença de hoje vale mais do que a perfeição da semana.</p><button class="text-action" style="margin-top:8px" data-view="history">Ver histórico completo →</button></div>
    <div class="section-title"><h3>Seu ritmo</h3></div><div class="reward-card"><div class="reward-top"><div><div class="eyebrow">NÍVEL ${level.level}</div><strong>${data.rewards.points} pontos</strong></div><span class="reward-star">✦</span></div><div class="reward-track"><span style="width:${level.progress}%"></span></div><p>${100 - level.progress} pontos para a próxima conquista</p>${data.rewards.badges.length ? `<div class="badge-row">${data.rewards.badges.map(badge => `<span class="badge">✦ ${badge}</span>`).join('')}</div>` : ''}<p class="small">Você já passou <strong data-usage-time>${formatUsageTime(data.usage?.totalSeconds || 0)}</strong> comigo.</p></div>
    <div class="section-title"><h3>Seu impacto</h3></div><div class="rescue-card"><div><div class="eyebrow">VOCÊ NÃO DESISTIU</div><strong>${rescueRate()}%</strong><p>Das vezes que bateu vontade de desistir, você apareceu em ${data.analytics.rescues} de ${data.analytics.rescueOpportunities}. Isso é força de verdade.</p></div><span class="rescue-icon">↗</span></div>
  </section>`;
}
function trainingDate() { const [hours, minutes] = data.profile.time.split(':').map(Number); const date = new Date(); date.setHours(hours || 19, minutes || 0, 0, 0); return date; }
function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function currentDateLabel(date = new Date()) { return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); }
const SPORT_CATEGORY_ICON_PATHS = {
  endurance: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  strength: '<rect x="2" y="9" width="4" height="6" rx="1.2"/><rect x="18" y="9" width="4" height="6" rx="1.2"/><path d="M6 12h12"/>',
  flow: '<path d="M3 14c2.5-6 5.5-6 8 0s5.5 6 8 0"/>',
  combat: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z"/>',
  team: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5 15.5 10l-1.3 4.2H9.8L8.5 10Z"/>',
  court: '<circle cx="12" cy="9" r="6"/><path d="M12 15v6M9 18h6"/>',
  urban: '<path d="M3 18 9 8l4 6 2-3 6 7Z"/>',
  direct: '<path d="M12 3l2.2 5.8L21 10l-4.5 3.6L18 20l-6-3.6L6 20l1.5-6.4L3 10l6.8-1.2Z"/>'
};
const SPORT_SPECIFIC_ICON_PATHS = {
  ciclismo: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 10 8h5l3 9M10 8l2 5h6"/>',
  surf: '<path d="M12 2c1.8 4.5 2.4 10.5.8 18.5"/><path d="M3 19c3-1.8 6-1.8 9 0s6 1.8 9 0"/>',
  remo: '<path d="M3 21 21 3"/><ellipse cx="5.5" cy="18.5" rx="2.3" ry="1.3" transform="rotate(-45 5.5 18.5)"/><ellipse cx="18.5" cy="5.5" rx="2.3" ry="1.3" transform="rotate(-45 18.5 5.5)"/>',
  canoagem: '<path d="M3 21 21 3"/><ellipse cx="5.5" cy="18.5" rx="2.3" ry="1.3" transform="rotate(-45 5.5 18.5)"/><ellipse cx="18.5" cy="5.5" rx="2.3" ry="1.3" transform="rotate(-45 18.5 5.5)"/>',
  natacao: '<path d="M3 12c2-3 5-3 7 0s5 3 7 0 5-3 7 0"/><path d="M3 18c2-2 5-2 7 0s5 2 7 0 5-2 7 0"/>',
  corrida: '<circle cx="15" cy="5" r="2"/><path d="M9 21l2-6-3-2 2-4 4 1 3 4-2 6"/>',
  skate: '<path d="M4 15h16M6 9l12 6"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  caminhada: '<circle cx="9" cy="4" r="2"/><path d="M9 8v6l-3 7M9 14l4 2 2 6M9 11l5-1"/>',
  crossfit: '<circle cx="12" cy="14" r="6"/><path d="M9 8a3 3 0 0 1 6 0v2H9Z"/>',
  danca: '<circle cx="12" cy="4" r="2"/><path d="M12 8v5l-4 3M12 13l5 2M9 21l3-5 3 5"/>',
  futebol: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10Z"/>',
  futsal: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10Z"/>',
  basquete: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.5 5.5c3 3 3 10 0 13M18.5 5.5c-3 3-3 10 0 13"/>',
  volei: '<circle cx="12" cy="12" r="9"/><path d="M12 3c3 2 4 6 2 9M6 6c3 2 3 7 0 11M18 8c-2 2-2 6 1 9"/>',
  tenis: '<circle cx="9" cy="8" r="5"/><path d="M9 3v10M4 8h10M12.5 12.5 20 20"/>',
  'beach-tennis': '<circle cx="9" cy="8" r="5"/><path d="M9 3v10M4 8h10M12.5 12.5 20 20"/>',
  badminton: '<circle cx="9" cy="8" r="5"/><path d="M9 3v10M4 8h10M12.5 12.5 20 20"/>',
  squash: '<circle cx="9" cy="8" r="5"/><path d="M9 3v10M4 8h10M12.5 12.5 20 20"/>',
  yoga: '<circle cx="12" cy="4" r="2"/><path d="M12 8c-3 1-5 3-5 6M12 8c3 1 5 3 5 6M12 8v9"/>',
  pilates: '<circle cx="12" cy="4" r="2"/><path d="M12 8c-3 1-5 3-5 6M12 8c3 1 5 3 5 6M12 8v9"/>',
  alongamento: '<circle cx="12" cy="4" r="2"/><path d="M12 8c-3 1-5 3-5 6M12 8c3 1 5 3 5 6M12 8v9"/>',
  boxe: '<path d="M6 13V9a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h1a3 3 0 0 1 3 3v3a4 4 0 0 1-4 4H9a3 3 0 0 1-3-3Z"/>',
  'jiu-jitsu': '<circle cx="12" cy="4" r="2"/><path d="M12 8v6M12 9l-5 2M12 9l5-1M12 14l-3 7M12 14l4 6"/>',
  'muay-thai': '<circle cx="12" cy="4" r="2"/><path d="M12 8v6M12 9l-5 2M12 9l5-1M12 14l-3 7M12 14l4 6"/>',
  karate: '<circle cx="12" cy="4" r="2"/><path d="M12 8v6M12 9l-5 2M12 9l5-1M12 14l-3 7M12 14l4 6"/>',
  taekwondo: '<circle cx="12" cy="4" r="2"/><path d="M12 8v6M12 9l-5 2M12 9l5-1M12 14l-3 7M12 14l4 6"/>',
  mma: '<circle cx="12" cy="4" r="2"/><path d="M12 8v6M12 9l-5 2M12 9l5-1M12 14l-3 7M12 14l4 6"/>',
  escalada: '<path d="M3 20 10 8l3 5 2-3 6 10Z"/><circle cx="9" cy="14" r="1"/><circle cx="14" cy="16" r="1"/>',
  atletismo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2"/>',
  ginastica: '<circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><path d="M8 13V4h8v9"/>',
  handebol: '<circle cx="9" cy="9" r="4"/><path d="M13 13c2 0 5 1 6 3-1 3-4 5-7 5-2 0-4-1-5-3"/>',
  rugby: '<ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-20 12 12)"/><path d="M7 10l10 4M8.5 8.5l7 7" transform="rotate(-20 12 12)"/>',
  criquete: '<path d="M5 19 12 12"/><path d="M12 12 18 4"/><path d="M16 3l3 3"/>',
  beisebol: '<path d="M5 19 15 9"/><circle cx="18" cy="6" r="2.3"/>',
  softbol: '<path d="M5 19 15 9"/><circle cx="18" cy="6" r="2.3"/>',
  hoquei: '<path d="M8 3 6 17a2 2 0 0 0 2 2h4"/><ellipse cx="17" cy="19" rx="3" ry="1.5"/>',
  'polo-aquatico': '<circle cx="12" cy="9" r="4"/><path d="M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  patinacao: '<path d="M5 16h11l3-3"/><path d="M8 16V6h6v6"/><path d="M5 19h9"/>',
  'stand-up-paddle': '<path d="M4 21 20 5"/><path d="M17 2l3 3"/><path d="M4 21c2-4 2-8 0-11"/>',
  triatlo: '<circle cx="6" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 18 12 6 18 18"/>',
};
function sportIcon(activity = data.profile.activity) {
  const key = sportKey(activity);
  const specific = SPORT_SPECIFIC_ICON_PATHS[key];
  const slug = sportLayout(activity).slug;
  const path = specific || SPORT_CATEGORY_ICON_PATHS[slug] || SPORT_CATEGORY_ICON_PATHS.direct;
  return `<svg class="sport-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
function sportKey(activity = data.profile.activity) { return String(activity).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
function historyItemForDay(date) {
  const key = todayKey(date);
  return data.history.find(item => (item.dateKey === key || item.date === key) && item.activity === data.profile.activity);
}
function renderWeeklyChart() {
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
  const now = new Date();
  const monday = new Date(now);
  const currentDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - currentDay + 1);
  const todayKeyValue = todayKey();
  const bars = labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const item = historyItemForDay(date);
    const isToday = todayKey(date) === todayKeyValue;
    const isFuture = date > now && !isToday;
    const completed = item?.status === 'COMPLETED';
    const height = completed ? 100 : isFuture ? 6 : 16;
    const barClass = completed ? 'chart-bar-done' : isToday ? 'chart-bar-today' : '';
    return `<div class="chart-col"><div class="chart-track"><div class="chart-bar ${barClass}" style="height:${height}%"></div></div><span class="chart-label ${isToday ? 'chart-label-today' : ''}">${label}</span></div>`;
  }).join('');
  return `<div class="weekly-chart">${bars}</div>`;
}
function renderEvolutionChart(weekCount = 6) {
  const now = new Date();
  const thisMonday = new Date(now);
  const currentDay = thisMonday.getDay() || 7;
  thisMonday.setDate(thisMonday.getDate() - currentDay + 1);
  const buckets = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const count = data.history.filter(item => {
      if (item.status !== 'COMPLETED' || !item.dateKey) return false;
      const itemDate = new Date(`${item.dateKey}T00:00:00`);
      return itemDate >= weekStart && itemDate <= weekEnd;
    }).length;
    buckets.push({ label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, count });
  }
  const max = Math.max(1, ...buckets.map(bucket => bucket.count));
  const width = 300, height = 70;
  const stepX = width / (buckets.length - 1 || 1);
  const points = buckets.map((bucket, index) => `${(index * stepX).toFixed(1)},${(height - (bucket.count / max) * height).toFixed(1)}`).join(' ');
  const hasData = buckets.some(bucket => bucket.count > 0);
  return `<div class="card evolution-card"><div class="section-title" style="margin-top:0"><h3>Sua evolução</h3></div>${hasData ? `<svg class="evolution-chart" viewBox="0 -6 ${width} ${height + 12}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />${buckets.map((bucket, index) => `<circle cx="${(index * stepX).toFixed(1)}" cy="${(height - (bucket.count / max) * height).toFixed(1)}" r="3" fill="var(--brand)" />`).join('')}</svg><div class="evolution-labels">${buckets.map(bucket => `<span>${bucket.label}</span>`).join('')}</div>` : '<p class="small">Seus treinos concluídos vão desenhar sua evolução aqui, semana a semana.</p>'}</div>`;
}
function selectedDaysForFrequency(frequency, days) {
  const validDays = [...new Set(days || [])];
  if (validDays.length) return validDays.slice(0, Math.max(1, frequency));
  return ['Segunda', 'Quarta', 'Sexta'].slice(0, Math.max(1, frequency));
}
function formatCountdown(milliseconds) { const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000)); const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0'); const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'); const seconds = String(totalSeconds % 60).padStart(2, '0'); return `${hours}:${minutes}:${seconds}`; }
function updateLivePanel() {
  const clock = document.querySelector('[data-live-clock]'); const countdown = document.querySelector('[data-live-countdown]'); const status = document.querySelector('[data-live-status]');
  if (clock && countdown && status) {
    const now = new Date(); const difference = trainingDate().getTime() - now.getTime();
    runPreparationJourney(difference);
    clock.textContent = now.toLocaleTimeString('pt-BR');
    if (data.session.status === 'COMPLETED') { status.textContent = 'Treino concluído'; countdown.textContent = 'Você apareceu por você hoje.'; }
    else if (difference > 60 * 60 * 1000) { status.textContent = 'Ainda dá tempo de se preparar'; countdown.textContent = `Começamos em ${formatCountdown(difference)}`; }
    else if (difference > 20 * 60 * 1000) { status.textContent = 'Seu momento está chegando'; countdown.textContent = `Faltam ${formatCountdown(difference)}`; }
    else if (difference > 0) { status.textContent = 'É hora de começar'; countdown.textContent = `Faltam ${formatCountdown(difference)}`; }
    else { status.textContent = 'Hora do seu treino'; countdown.textContent = 'Estou aqui com você. Um passo de cada vez.'; }
  }
  updateWorkoutTimer();
  updateUsageTime();
}
const LIVE_WORKOUT_STATES = ['ENGAGED', 'PREPARING_TO_GO', 'LEFT'];
function updateWorkoutTimer() {
  if (!data.session.startedAtClient && LIVE_WORKOUT_STATES.includes(data.session.status)) { data.session.startedAtClient = Date.now(); save(); }
  const badge = document.querySelector('[data-workout-timer-badge]');
  const label = document.querySelector('[data-workout-timer]');
  if (!badge || !label) return;
  if (!data.session.startedAtClient || !LIVE_WORKOUT_STATES.includes(data.session.status)) { badge.hidden = true; return; }
  badge.hidden = false;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - data.session.startedAtClient) / 1000));
  label.textContent = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
}
function updateUsageTime() {
  if (document.visibilityState !== 'visible') return;
  data.usage = data.usage || { totalSeconds: 0 };
  data.usage.totalSeconds = (data.usage.totalSeconds || 0) + 1;
  const label = document.querySelector('[data-usage-time]');
  if (label) label.textContent = formatUsageTime(data.usage.totalSeconds);
}
function formatUsageTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}`;
  return `${minutes} min`;
}
function startLiveClock() { window.clearInterval(liveTimer); updateLivePanel(); liveTimer = window.setInterval(updateLivePanel, 1000); }
function runPreparationJourney(millisecondsUntilTraining) {
  if (data.session.status === 'COMPLETED' || data.session.status === 'CANCELLED' || data.session.status === 'RESCHEDULED' || data.session.confirmed) return;
  const minutes = millisecondsUntilTraining / 60000;
  const steps = [
    { key: 't60', limit: 60, state: 'PREPARING', text: `E aí, ${data.profile.name}! Hoje tem treino. Vamos começar a nos preparar?` },
    { key: 't45', limit: 45, state: 'PREPARING', text: 'Já separou sua roupa?' },
    { key: 't30', limit: 30, state: 'ENGAGED', text: 'Como está sua vontade de ir hoje? De 0 a 10.' },
    { key: 't20', limit: 20, state: 'OBJECTION', text: 'Percebi que você ainda não foi. Está tudo bem. O que está acontecendo?' }
  ];
  const step = steps.find(item => minutes <= item.limit && !data.session.journey[item.key]);
  if (!step) return;
  data.session.journey[step.key] = true; data.session.status = step.state; addMessage('app', step.text); save();
  toast(step.key.toUpperCase() + ' · mensagem enviada');
  if (currentView === 'today') render();
}
function statusLabel(status) { return ({ PREPARING: 'preparação', OBJECTION: 'conversa', PREPARING_TO_GO: 'quase lá', LEFT: 'a caminho', COMPLETED: 'realizado', RESCHEDULED: 'remarcado', CANCELLED: 'cancelado', NOT_COMPLETED: 'não realizado', ENGAGED: 'em conversa' }[status] || 'planejado'); }
function statusVisual(status) { return ({ PENDING: 'neutral', PREPARING: 'attention', ENGAGED: 'active', OBJECTION: 'conversation', PREPARING_TO_GO: 'active', LEFT: 'active', COMPLETED: 'success', CANCELLED: 'neutral', RESCHEDULED: 'neutral', NOT_COMPLETED: 'neutral' }[status] || 'neutral'); }
function meetingPointsForUser() { const activity = data.profile.activity; return meetingPointCatalog.filter(point => point.activities.includes(activity) || point.activities.includes('Outra') || point.id === 'qualquer-cidade'); }
let pickupEvents = [];
let mapFilters = { sport: 'all', maxPriceCents: null, timeWindow: 'any', radiusKm: null };
function withinTimeWindow(iso, window) {
  if (window === 'any') return true;
  const target = new Date(iso), now = new Date();
  if (window === 'today') return target.toDateString() === now.toDateString();
  const weekAhead = new Date(now.getTime() + 7 * 86400000);
  return target >= now && target <= weekAhead;
}
function filterPickupEventsForMap(events) {
  return events.filter(event => {
    if (mapFilters.sport !== 'all' && event.activity !== mapFilters.sport) return false;
    if (mapFilters.maxPriceCents != null && event.price_cents > mapFilters.maxPriceCents) return false;
    if (!withinTimeWindow(event.scheduled_at, mapFilters.timeWindow)) return false;
    if (mapFilters.radiusKm != null && myLiveCoordinates && Number.isFinite(event.lat) && Number.isFinite(event.lng)) {
      if (distanceBetween(myLiveCoordinates, [event.lat, event.lng]) / 1000 > mapFilters.radiusKm) return false;
    }
    return true;
  });
}
function filterMeetingPointsForMap(points) {
  return points.filter(point => {
    if (mapFilters.sport !== 'all' && point.id !== 'qualquer-cidade' && !point.activities.includes(mapFilters.sport)) return false;
    if (mapFilters.radiusKm != null && myLiveCoordinates && point.id !== 'qualquer-cidade') {
      if (distanceBetween(myLiveCoordinates, [point.lat, point.lng]) / 1000 > mapFilters.radiusKm) return false;
    }
    return true;
  });
}
function formatEventDateTime(iso) {
  const date = new Date(iso);
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
function formatEventPrice(cents) {
  if (!cents) return 'Gratuito';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
async function loadPickupEvents() {
  try { pickupEvents = (await apiRequest('/api/pickup-events')) || []; } catch { /* Mantém a última lista carregada. */ }
  if (['map', 'community'].includes(currentView)) render();
}
function renderPickupEventCard(event) {
  const full = event.spots_taken >= event.max_spots;
  const avatars = event.participants.slice(0, 5).map(person => `<span class="pickup-avatar">${escapeHtml((person.name || '?')[0])}</span>`).join('');
  const extra = event.participants.length > 5 ? `<span class="pickup-avatar pickup-avatar-more">+${event.participants.length - 5}</span>` : '';
  const terms = pickupEventTerms(event.activity);
  const isCreator = event.creator_id === data.userId;
  const actionLabel = isCreator ? `Cancelar ${terms.noun}` : event.joined ? `Sair do ${terms.noun}` : full ? 'Lotado' : 'Participar';
  const missing = event.max_spots - event.spots_taken;
  const spotsLabel = full ? `${event.spots_taken}/${event.max_spots} ${terms.people}` : `Faltam ${missing} ${terms.people}`;
  return `<article class="card pickup-event-card"><div class="pickup-event-head"><div class="meeting-point-icon">${sportIcon(event.activity)}</div><div><h3>${escapeHtml(event.title)}</h3><p class="small">${escapeHtml(event.location_name)}</p></div><span class="status-pill ${full ? 'status-neutral' : 'status-active'}">${spotsLabel}</span></div><div class="pickup-event-meta"><span>📅 ${formatEventDateTime(event.scheduled_at)}</span><span>⏱ ${event.duration_minutes} min</span><span>💰 ${formatEventPrice(event.price_cents)}</span></div>${event.participants.length ? `<div class="pickup-event-participants">${avatars}${extra}</div>` : ''}<div class="pickup-event-actions"><button class="${isCreator || event.joined ? 'secondary' : 'primary'} pickup-event-button" data-pickup-event="${event.id}" data-joined="${event.joined}" data-creator="${isCreator}" ${full && !event.joined ? 'disabled' : ''}>${actionLabel}</button>${isCreator || event.joined ? `<button class="secondary pickup-event-chat-button" data-open-pickup-chat="${event.id}">💬 Conversar</button>` : ''}${(isCreator || event.joined) && sportLayout(event.activity).slug === 'team' ? `<button class="secondary pickup-team-button" data-organize-team="${event.id}">🎲 Times</button>` : ''}</div></article>`;
}
function pickupEventTerms(activity) {
  const isTeam = sportLayout(activity).slug === 'team';
  return isTeam ? { noun: 'jogo', people: 'jogadores', verbCreate: 'Marcar um jogo' } : { noun: 'encontro', people: 'participantes', verbCreate: 'Marcar um encontro' };
}
function renderPickupEventsSection() {
  const relevant = pickupEvents.filter(event => event.activity === data.profile.activity || event.creator_id === data.userId || event.joined);
  const terms = pickupEventTerms(data.profile.activity);
  return `<div class="section-title"><div class="stat-line"><h3>${terms.noun === 'jogo' ? 'Jogos marcados' : 'Encontros marcados'}</h3><span class="status-pill">${relevant.length}</span></div></div><button class="secondary" style="width:100%;margin-bottom:14px" data-create-pickup-event>+ ${terms.verbCreate} de ${escapeHtml(data.profile.activity)}</button><div class="pickup-event-list">${relevant.length ? relevant.map(renderPickupEventCard).join('') : `<p class="small">Nenhum ${terms.noun} marcado ainda para essa modalidade. Que tal marcar o primeiro?</p>`}</div>`;
}
async function openCreatePickupEventModal() {
  const location = await openLocationPickerModal();
  if (!location) return;
  const values = await openModal({
    title: 'Marcar um jogo',
    message: `Local: ${location.name}`,
    fields: [
      { id: 'activity', label: 'Modalidade', type: 'select', options: sportCatalog, value: data.profile.activity },
      { id: 'scheduled_at', label: 'Data e hora', type: 'datetime-local' },
      { id: 'duration_minutes', label: 'Duração (minutos)', value: 60, type: 'number', min: 15, max: 480 },
      { id: 'price_cents', label: 'Preço por pessoa (R$, 0 se for grátis)', value: 0, type: 'number', min: 0 },
      { id: 'max_spots', label: 'Vagas', value: 10, type: 'number', min: 1, max: 200 },
    ],
    confirmText: 'Marcar jogo',
  });
  if (!values) return;
  const activity = values.activity?.trim();
  const title = `${activity} com a galera`;
  if (!activity || !values.scheduled_at) { toast('Preencha modalidade e data'); return; }
  try {
    await apiRequest('/api/pickup-events', { method: 'POST', body: JSON.stringify({
      title, activity, location_name: location.name, lat: location.lat, lng: location.lng,
      scheduled_at: new Date(values.scheduled_at).toISOString(),
      duration_minutes: Number(values.duration_minutes) || 60,
      price_cents: Math.round((Number(values.price_cents) || 0) * 100),
      max_spots: Number(values.max_spots) || 10,
    }) });
    toast('Jogo marcado!');
    loadPickupEvents();
  } catch { toast('Não foi possível marcar o jogo agora. Você está conectado ao servidor?'); }
}
let nearbyPlaces = [];
let nearbyPlacesConfigured = null;
async function loadNearbyPlaces() {
  if (!navigator.geolocation) { nearbyPlacesConfigured = false; return; }
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const result = await apiRequest(`/api/places/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}&activity=${encodeURIComponent(data.profile.activity)}`);
      nearbyPlacesConfigured = result?.configured ?? false;
      nearbyPlaces = result?.results || [];
    } catch { nearbyPlacesConfigured = false; }
    if (currentView === 'map') render();
  }, () => { nearbyPlacesConfigured = false; if (currentView === 'map') render(); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
}
function renderNearbyPlaceCard(place) {
  const stars = place.rating ? '⭐'.repeat(Math.max(1, Math.round(place.rating))) : '';
  return `<article class="card nearby-place-card"><h3>${escapeHtml(place.name)}</h3>${place.address ? `<p class="small">${escapeHtml(place.address)}</p>` : ''}<div class="pickup-event-meta">${place.rating ? `<span>${stars} ${place.rating.toFixed(1)} (${place.ratingsCount || 0})</span>` : ''}${place.openNow !== null ? `<span class="status-pill ${place.openNow ? 'status-active' : 'status-neutral'}">${place.openNow ? 'Aberto agora' : 'Fechado agora'}</span>` : ''}</div>${place.lat && place.lng ? `<div class="meeting-point-nav"><a class="nav-link nav-link-primary" href="https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes" target="_blank" rel="noopener">🧭 Waze</a><a class="nav-link" href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}" target="_blank" rel="noopener">📍 Maps</a></div>` : ''}</article>`;
}
function renderNearbyPlacesSection() {
  if (nearbyPlacesConfigured === false && !nearbyPlaces.length) return '';
  if (nearbyPlacesConfigured === null) return `<div class="section-title"><h3>Academias e locais perto de você</h3></div><p class="small">Buscando locais reais perto de você...</p>`;
  return `<div class="section-title"><div class="stat-line"><h3>Academias e locais perto de você</h3><span class="status-pill">Google</span></div></div><div class="nearby-place-list">${nearbyPlaces.length ? nearbyPlaces.map(renderNearbyPlaceCard).join('') : '<p class="small">Nenhum resultado agora. Tente de novo mais perto do local.</p>'}</div>`;
}
function renderMapEventsSection() {
  const filtersActive = mapFilters.sport !== 'all' || mapFilters.maxPriceCents != null || mapFilters.timeWindow !== 'any' || mapFilters.radiusKm != null;
  if (!filtersActive) return renderPickupEventsSection();
  const filtered = filterPickupEventsForMap(pickupEvents);
  return `<div class="section-title"><div class="stat-line"><h3>Encontros filtrados</h3><span class="status-pill">${filtered.length}</span></div></div><div class="pickup-event-list">${filtered.length ? filtered.map(renderPickupEventCard).join('') : '<p class="small">Nenhum resultado com esses filtros.</p>'}</div>`;
}
function renderMapSportChips() {
  const chips = ['all', ...DRAWER_QUICK_SPORTS];
  return `<div class="map-sport-chips">${chips.map(sport => `<button type="button" class="map-sport-chip ${mapFilters.sport === sport ? 'selected' : ''}" data-map-sport-chip="${escapeHtml(sport)}">${sport === 'all' ? 'Todas' : escapeHtml(sport)}</button>`).join('')}</div>`;
}
function renderMap() { const points = meetingPointsForUser(); return `<section class="screen map-screen">${header('Mapa', 'MAPA')}${renderMapSportChips()}<div class="map-toolbar"><button class="map-toolbar-button" type="button" data-open-map-filters>⚙ Filtros</button><button class="map-toolbar-button ${liveLocationSharing ? 'active' : ''}" type="button" data-toggle-live-location>${liveLocationSharing ? '● Você está visível' : '◌ Ficar visível'}</button></div><div id="meeting-map" class="map-hero" aria-label="Mapa com pontos públicos de encontro"></div><p class="map-safety-note">✓ Só locais públicos. Nunca sua localização exata.</p><button class="secondary map-fit-button" data-fit-meeting-map>Ver todos os pontos no mapa</button>${renderMapEventsSection()}<div class="section-title"><div class="stat-line"><h3>Para ${escapeHtml(data.profile.activity)}</h3><span class="status-pill">${points.length} pontos</span></div></div><div class="meeting-point-list">${points.map(point => { const joined = data.community.meetingPointIds.includes(point.id); const count = point.members + (joined ? 1 : 0); return `<article class="card meeting-point-card"><div class="meeting-point-head"><div class="meeting-point-icon">${sportIcon(data.profile.activity)}</div><div><h3>${escapeHtml(point.name)}</h3><p class="small">${escapeHtml(point.city)}</p></div><span class="point-distance">público</span></div><p class="meeting-point-note">${escapeHtml(point.note)}</p><div class="meeting-point-nav">${point.id !== 'qualquer-cidade' ? `<a class="nav-link nav-link-primary" href="https://waze.com/ul?ll=${point.lat},${point.lng}&navigate=yes" target="_blank" rel="noopener">🧭 Ir de Waze</a><a class="nav-link" href="https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}" target="_blank" rel="noopener">📍 Ir de Google Maps</a>` : `<a class="nav-link nav-link-primary" href="https://waze.com/ul?q=${encodeURIComponent(data.profile.activity || 'atividade fisica')}&navigate=yes" target="_blank" rel="noopener">🧭 Buscar no Waze perto de mim</a><a class="nav-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((data.profile.activity || 'atividade fisica') + ' perto de mim')}" target="_blank" rel="noopener">📍 Buscar no Google Maps</a>`}</div><div class="meeting-point-meta"><span><strong>${count}</strong> interessados</span><span>${escapeHtml(point.activities.slice(0, 2).join(' · '))}</span></div><button class="${joined ? 'secondary' : 'primary'} meeting-point-button" data-meeting-point="${point.id}">${joined ? 'Você está neste ponto' : 'Quero encontrar pessoas aqui'}</button></article>`; }).join('')}</div>${renderNearbyPlacesSection()}</section>`; }
function initMeetingMap() {
  if (!window.L || !document.querySelector('#meeting-map')) return;
  const points = filterMeetingPointsForMap(meetingPointsForUser().filter(point => point.id !== 'qualquer-cidade'));
  mapInstance?.remove();
  mapInstance = L.map('meeting-map').setView(myLiveCoordinates || [-14.235, -51.925], myLiveCoordinates ? 13 : 4);
  // Sem localizacao nem nenhum ponto marcado, o mapa ficava no zoom bem
  // aberto (continente inteiro) e sempre aparecia algum lugar distante tipo
  // Argentina na tela -- confuso pra quem nao sabe que e so o zoom padrao.
  // Buscando a posicao real (sem ativar o compartilhamento ao vivo) da pra
  // centralizar direito assim que ela chegar.
  if (!myLiveCoordinates && navigator.geolocation) {
    const mapAtRequestTime = mapInstance;
    navigator.geolocation.getCurrentPosition(position => {
      if (mapInstance !== mapAtRequestTime) return;
      mapInstance.setView([position.coords.latitude, position.coords.longitude], 13);
    }, () => {}, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(mapInstance);
  const bounds = [];
  points.forEach(point => { const coordinates = [point.lat, point.lng]; bounds.push(coordinates); L.marker(coordinates).addTo(mapInstance).bindPopup(`<strong>${escapeHtml(point.name)}</strong><br>${escapeHtml(point.city)}`); });
  liveLocationPeers.forEach(peer => {
    const coordinates = [peer.lat, peer.lng];
    bounds.push(coordinates);
    const initial = escapeHtml((peer.name || '?')[0].toUpperCase());
    L.marker(coordinates, { icon: L.divIcon({ className: 'live-peer-pin', html: `<span class="live-peer-pin-dot">${initial}</span><span class="live-peer-pin-pulse"></span>`, iconSize: [34, 34] }) })
      .addTo(mapInstance)
      .bindPopup(`<strong>${escapeHtml(peer.name || 'Alguém')}</strong><br>${escapeHtml(peer.activity || '')} · ao vivo agora`);
  });
  if (myLiveCoordinates) {
    bounds.push(myLiveCoordinates);
    L.marker(myLiveCoordinates, { icon: L.divIcon({ className: 'my-live-pin', html: '<span class="my-live-pin-dot"></span><span class="my-live-pin-pulse"></span>', iconSize: [22, 22] }), zIndexOffset: 500 })
      .addTo(mapInstance)
      .bindPopup('Você está aqui agora');
    liveLocationPeers.forEach(peer => {
      const peerCoordinates = [peer.lat, peer.lng];
      const meters = distanceBetween(myLiveCoordinates, peerCoordinates);
      const distanceLabel = meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
      const etaMinutes = Math.max(1, Math.round(meters / 1.4 / 60));
      const line = L.polyline([myLiveCoordinates, peerCoordinates], { color: '#366b4e', weight: 2, dashArray: '6 8', opacity: .65 }).addTo(mapInstance);
      const midpoint = [(myLiveCoordinates[0] + peerCoordinates[0]) / 2, (myLiveCoordinates[1] + peerCoordinates[1]) / 2];
      const label = L.marker(midpoint, { icon: L.divIcon({ className: 'live-distance-label', html: `${distanceLabel} · ~${etaMinutes} min a pé`, iconSize: [0, 0] }), interactive: false }).addTo(mapInstance);
      // Linha reta e so o palpite inicial (instantaneo) -- tenta trocar pelo
      // caminho real de rua (igual 99/Uber) assim que o servico de rotas
      // responder. Se falhar ou demorar, a linha reta continua valendo.
      upgradeRouteToRealPath(mapInstance, myLiveCoordinates, peerCoordinates, line, label, distanceLabel);
    });
  }
  filterPickupEventsForMap(pickupEvents.filter(event => Number.isFinite(event.lat) && Number.isFinite(event.lng))).forEach(event => {
    const coordinates = [event.lat, event.lng];
    bounds.push(coordinates);
    const pinColor = DRAWER_CATEGORY_COLORS[sportLayout(event.activity).slug] || DRAWER_CATEGORY_COLORS.direct;
    L.marker(coordinates, { icon: L.divIcon({ className: 'pickup-map-pin-badge', html: `<span style="background:${pinColor}">${sportIcon(event.activity)}</span>`, iconSize: [32, 32] }) }).addTo(mapInstance)
      .bindPopup(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.location_name)}<br>${new Date(event.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`);
  });
  if (bounds.length) mapInstance.fitBounds(bounds, { padding: [24, 24] });
}
async function upgradeRouteToRealPath(mapAtCallTime, from, to, straightLine, label, distanceLabel) {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const result = await response.json();
    const route = result?.routes?.[0];
    if (!route || mapInstance !== mapAtCallTime) return;
    const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    straightLine.setLatLngs(path);
    straightLine.setStyle({ dashArray: null, weight: 3, opacity: .85 });
    const etaMinutes = Math.max(1, Math.round(route.duration / 60));
    label.setIcon(L.divIcon({ className: 'live-distance-label', html: `${distanceLabel} · ~${etaMinutes} min a pé`, iconSize: [0, 0] }));
  } catch { /* Sem rota real agora -- a linha reta e a estimativa continuam valendo. */ }
}
let liveLocationSharing = false;
let liveLocationPeers = [];
let mapPeersLoaded = false;
let communityDataLoaded = false;
async function loadLiveLocationPeers() {
  try { liveLocationPeers = (await apiRequest('/api/live-location')) || []; } catch { /* Mantém a última lista carregada. */ }
  if (currentView === 'map') render();
}
let myLiveCoordinates = null;
let liveLocationWatcherId = null;
let lastLiveLocationSentAt = 0;
let lastLiveLocationSentCoords = null;
let lastMapRenderFromWatcherAt = 0;

function stopLiveLocationWatcher() {
  if (liveLocationWatcherId !== null) { navigator.geolocation.clearWatch(liveLocationWatcherId); liveLocationWatcherId = null; }
}

async function sendLiveLocationUpdate(position, force) {
  const coordinates = [position.coords.latitude, position.coords.longitude];
  myLiveCoordinates = coordinates;
  const now = Date.now();
  const movedEnough = !lastLiveLocationSentCoords || distanceBetween(lastLiveLocationSentCoords, coordinates) > 25;
  if (force || movedEnough || now - lastLiveLocationSentAt > 20000) {
    lastLiveLocationSentAt = now;
    lastLiveLocationSentCoords = coordinates;
    try { await apiRequest('/api/live-location', { method: 'POST', body: JSON.stringify({ lat: coordinates[0], lng: coordinates[1], activity: data.profile.activity }) }); } catch { /* Mantem a ultima posicao conhecida, tenta de novo na proxima atualizacao. */ }
  }
  if (currentView === 'map' && now - lastMapRenderFromWatcherAt > 4000) { lastMapRenderFromWatcherAt = now; render(); }
}

function startLiveLocationWatcher() {
  stopLiveLocationWatcher();
  liveLocationWatcherId = navigator.geolocation.watchPosition(position => sendLiveLocationUpdate(position, false), () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
}

async function toggleLiveLocationSharing() {
  if (liveLocationSharing) {
    stopLiveLocationWatcher();
    try { await apiRequest('/api/live-location', { method: 'DELETE' }); } catch { /* Segue offline. */ }
    liveLocationSharing = false;
    myLiveCoordinates = null;
    toast('Localização desativada');
    render();
    return;
  }
  if (!navigator.geolocation) { toast('Localização não suportada neste aparelho'); return; }
  navigator.geolocation.getCurrentPosition(async position => {
    await sendLiveLocationUpdate(position, true);
    liveLocationSharing = true;
    startLiveLocationWatcher();
    toast('Localização ativada por até 2 horas -- atualiza sozinha enquanto você se move');
    render();
  }, () => toast('Permissão de localização negada'), { enableHighAccuracy: true, timeout: 10000 });
}
function fitMeetingMap() { if (mapInstance && currentView === 'map') initMeetingMap(); else toast('Abra o mapa de encontros primeiro'); }
function openMapFiltersModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet map-filters-sheet" role="dialog" aria-modal="true" aria-label="Filtros do mapa">
    <h3>Filtros</h3>
    <span class="field-label">Modalidade</span>
    <div class="choice-grid map-filter-sports">
      <button type="button" class="choice ${mapFilters.sport === 'all' ? 'selected' : ''}" data-filter-sport="all">Todas</button>
      ${sportCatalog.map(sport => `<button type="button" class="choice ${mapFilters.sport === sport ? 'selected' : ''}" data-filter-sport="${escapeHtml(sport)}">${escapeHtml(sport)}</button>`).join('')}
    </div>
    <span class="field-label">Quando</span>
    <div class="challenge-period-tabs map-filter-time">
      ${[['any', 'Qualquer'], ['today', 'Hoje'], ['week', 'Essa semana']].map(([value, label]) => `<button type="button" class="period-tab ${mapFilters.timeWindow === value ? 'selected' : ''}" data-filter-time="${value}">${label}</button>`).join('')}
    </div>
    <label class="field-label" for="filter-price">Preço máximo (R$)</label>
    <input id="filter-price" class="text-input" type="number" min="0" placeholder="Sem limite" value="${mapFilters.maxPriceCents != null ? mapFilters.maxPriceCents / 100 : ''}" />
    <label class="field-label" for="filter-radius">Distância máxima (km)${myLiveCoordinates ? '' : ' — ative "Ficar visível" para usar'}</label>
    <input id="filter-radius" type="range" min="1" max="50" value="${mapFilters.radiusKm || 10}" ${myLiveCoordinates ? '' : 'disabled'} />
    <div class="modal-actions"><button type="button" class="secondary" data-filters-clear>Limpar</button><button type="button" class="primary" data-filters-apply>Aplicar</button></div>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-filter-sport]').forEach(button => button.addEventListener('click', () => { overlay.querySelectorAll('[data-filter-sport]').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); }));
  overlay.querySelectorAll('[data-filter-time]').forEach(button => button.addEventListener('click', () => { overlay.querySelectorAll('[data-filter-time]').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); }));
  overlay.querySelector('[data-filters-clear]').addEventListener('click', () => { mapFilters = { sport: 'all', maxPriceCents: null, timeWindow: 'any', radiusKm: null }; close(); render(); toast('Filtros limpos'); });
  overlay.querySelector('[data-filters-apply]').addEventListener('click', () => {
    mapFilters.sport = overlay.querySelector('[data-filter-sport].selected')?.dataset.filterSport || 'all';
    mapFilters.timeWindow = overlay.querySelector('[data-filter-time].selected')?.dataset.filterTime || 'any';
    const priceInput = overlay.querySelector('#filter-price').value;
    mapFilters.maxPriceCents = priceInput ? Math.round(Number(priceInput) * 100) : null;
    mapFilters.radiusKm = myLiveCoordinates ? Number(overlay.querySelector('#filter-radius').value) : null;
    close();
    render();
    toast('Filtros aplicados');
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
}
function distanceBetween(first, second) { const earthRadius = 6371000; const latitudeDelta = (second[0] - first[0]) * Math.PI / 180; const longitudeDelta = (second[1] - first[1]) * Math.PI / 180; const latitude = first[0] * Math.PI / 180; const nextLatitude = second[0] * Math.PI / 180; const a = Math.sin(latitudeDelta / 2) ** 2 + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude) * Math.cos(nextLatitude); return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
function updateTripMetrics() { const distance = document.querySelector('[data-trip-distance]'); const speed = document.querySelector('[data-trip-speed]'); const time = document.querySelector('[data-trip-time]'); if (!distance || !speed || !time) return; distance.textContent = tripState.distanceMeters < 1000 ? `${Math.round(tripState.distanceMeters)} m` : `${(tripState.distanceMeters / 1000).toFixed(2)} km`; speed.textContent = `${tripState.speedKmh.toFixed(1)} km/h`; const seconds = tripState.startedAt ? Math.floor((Date.now() - tripState.startedAt) / 1000) : 0; time.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function initMap() {
  if (!window.L || !document.querySelector('#live-map')) return;
  if (locationWatcher !== undefined && navigator.geolocation) navigator.geolocation.clearWatch(locationWatcher);
  window.clearInterval(tripTimer);
  tripState = { startedAt: null, lastPosition: null, distanceMeters: 0, speedKmh: 0 };
  const defaultPosition = [-14.235, -51.925];
  mapInstance = L.map('live-map').setView(defaultPosition, 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(mapInstance);
  const status = document.querySelector('#location-status');
  if (!navigator.geolocation) { status.textContent = 'GPS não disponível neste aparelho'; return; }
  status.textContent = 'Solicitando localização...';
  locationWatcher = navigator.geolocation.watchPosition(position => {
    const coordinates = [position.coords.latitude, position.coords.longitude];
    const now = Date.now();
    if (!tripState.startedAt) tripState.startedAt = now;
    if (tripState.lastPosition) { const segment = distanceBetween(tripState.lastPosition.coordinates, coordinates); if (segment > 2 && segment < 500) tripState.distanceMeters += segment; }
    if (position.coords.speed >= 0) tripState.speedKmh = position.coords.speed * 3.6;
    tripState.lastPosition = { coordinates, timestamp: now };
    if (!userMarker) userMarker = L.marker(coordinates).addTo(mapInstance).bindPopup(`${escapeHtml(data.profile.name)}, você está aqui`);
    else userMarker.setLatLng(coordinates);
    mapInstance.setView(coordinates, 16);
    status.textContent = 'Localização atualizada agora';
    updateTripMetrics();
  }, () => { status.textContent = 'Permissão de localização necessária'; }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
  tripTimer = window.setInterval(updateTripMetrics, 1000);
}
function centerMap() { if (userMarker && mapInstance) mapInstance.setView(userMarker.getLatLng(), 16); else toast('Aguardando sua localização'); }
let heartRateDevice = null;
const nativeBluetoothSupported = Boolean(window.DanaNative?.hasNativeBluetooth?.());
window.__danaNativeHeartRate = function (payload) {
  data.devices = data.devices || {};
  if (payload.connected === true) { data.devices.heartRateConnected = true; data.devices.heartRateName = payload.name || 'monitor cardíaco'; data.devices.heartRateBpm = null; toast(`Conectado a ${data.devices.heartRateName}`); }
  else if (payload.connected === false) { data.devices.heartRateConnected = false; if (payload.error) toast('Não foi possível conectar ao monitor cardíaco'); else toast('Monitor cardíaco desconectado'); }
  else if (typeof payload.bpm === 'number') { data.devices.heartRateBpm = payload.bpm; const valueLabel = document.querySelector('[data-heart-rate-value]'); if (valueLabel) valueLabel.textContent = `${payload.bpm} bpm`; const liveBadge = document.querySelector('[data-heart-rate-live]'); if (liveBadge) liveBadge.textContent = `${payload.bpm} bpm`; save(); return; }
  save();
  if (['profile', 'today'].includes(currentView)) render();
};
function renderHeartRateDeviceRow() {
  const bluetoothSupported = Boolean(navigator.bluetooth) || nativeBluetoothSupported;
  const connected = Boolean(data.devices?.heartRateConnected);
  const status = connected
    ? `Conectado a ${escapeHtml(data.devices.heartRateName || 'monitor cardíaco')} · <strong data-heart-rate-value>${data.devices.heartRateBpm ? data.devices.heartRateBpm + ' bpm' : 'aguardando dado...'}</strong>`
    : bluetoothSupported
      ? 'Conecte um monitor cardíaco Bluetooth (BLE) para sincronizar sua frequência cardíaca ao vivo.'
      : 'Disponível no Chrome (Android ou computador). Este navegador não suporta Bluetooth Web.';
  const button = connected
    ? '<button class="secondary" data-device-disconnect>Desconectar</button>'
    : `<button class="secondary" data-device-connect ${bluetoothSupported ? '' : 'disabled'}>Conectar</button>`;
  return `<div class="device-row"><div class="device-icon" aria-hidden="true">⌚</div><div class="device-copy"><strong>Relógio / monitor cardíaco</strong><p class="small">${status}</p></div>${button}</div>`;
}
async function connectHeartRateMonitor() {
  if (nativeBluetoothSupported) { window.DanaNative.connectHeartRate(); return; }
  if (!navigator.bluetooth) { toast('Bluetooth Web não é suportado neste navegador'); return; }
  try {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    heartRateDevice = device;
    device.addEventListener('gattserverdisconnected', onHeartRateDisconnected);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', handleHeartRateValue);
    data.devices = data.devices || {};
    data.devices.heartRateConnected = true;
    data.devices.heartRateName = device.name || 'monitor cardíaco';
    data.devices.heartRateBpm = null;
    save();
    toast(`Conectado a ${device.name || 'monitor cardíaco'}`);
    render();
  } catch (error) {
    if (error?.name === 'NotFoundError') return;
    toast('Não foi possível conectar ao dispositivo Bluetooth');
  }
}
function handleHeartRateValue(event) {
  const value = event.target.value;
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  const heartRate = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
  data.devices = data.devices || {};
  data.devices.heartRateBpm = heartRate;
  save();
  const valueLabel = document.querySelector('[data-heart-rate-value]');
  if (valueLabel) valueLabel.textContent = `${heartRate} bpm`;
  const liveBadge = document.querySelector('[data-heart-rate-live]');
  if (liveBadge) liveBadge.textContent = `${heartRate} bpm`;
}
function onHeartRateDisconnected() {
  data.devices = data.devices || {};
  data.devices.heartRateConnected = false;
  save();
  toast('Monitor cardíaco desconectado');
  if (['profile', 'today'].includes(currentView)) render();
}
function disconnectHeartRateMonitor() {
  if (nativeBluetoothSupported) { window.DanaNative.disconnectHeartRate(); return; }
  if (heartRateDevice?.gatt?.connected) heartRateDevice.gatt.disconnect();
  data.devices = data.devices || {};
  data.devices.heartRateConnected = false;
  save();
  render();
}
function renderProfileIdentityHeader() {
  const initial = String(data.profile.name || 'C').trim().charAt(0).toUpperCase();
  const completed = data.history.filter(item => item.status === 'COMPLETED').length;
  return `<div class="card profile-identity-card"><div class="profile-identity-row"><div class="profile-identity-avatar">${initial}</div><div><h2>${escapeHtml(data.profile.name)}</h2><p class="small">${escapeHtml(data.profile.activity)}</p></div></div><div class="stat-pills profile-stat-pills"><div class="stat-pill-chip"><span class="stat-pill-icon">✓</span><strong>${completed}</strong><span class="stat-pill-label">treinos</span></div><div class="stat-pill-chip"><span class="stat-pill-icon">🔥</span><strong>${data.rewards.streak}</strong><span class="stat-pill-label">sequência</span></div><div class="stat-pill-chip"><span class="stat-pill-icon">⚡</span><strong>${data.rewards.points}</strong><span class="stat-pill-label">pontos</span></div></div></div>`;
}
function renderProfileMenu() {
  return `<div class="card menu-list"><button class="menu-item" type="button" data-open-profile-details>Ver meus dados<span class="menu-chevron">›</span></button><button class="menu-item" type="button" data-view="customize">Personalizar esporte e layout<span class="menu-chevron">›</span></button><button class="menu-item" type="button" data-install-app>Instalar app neste aparelho<span class="menu-chevron">›</span></button><button class="menu-item" type="button" data-view="admin">Painel de desenvolvimento<span class="menu-chevron">›</span></button><button class="menu-item" type="button" data-reset>Refazer onboarding<span class="menu-chevron">›</span></button><a class="menu-item menu-item-link" href="/privacidade.html" target="_blank" rel="noopener">Política de privacidade<span class="menu-chevron">↗</span></a></div><button class="danger-action" style="width:100%;margin-top:14px" data-delete-account>Excluir meus dados e conta</button><button class="text-action" data-logout>Sair da conta</button>`;
}
function openProfileDetailsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet" role="dialog" aria-modal="true" aria-label="Meus dados"><div class="modal-header-row"><h3>Meus dados</h3><button class="icon-button" type="button" data-close-profile-details aria-label="Fechar">×</button></div><div class="profile-block"><div class="profile-line"><span class="small">Nome</span><strong>${escapeHtml(data.profile.name)}</strong></div><div class="profile-line"><span class="small">Atividades</span><strong>${escapeHtml((data.profile.activities || [data.profile.activity]).join(', '))}</strong></div><div class="profile-line"><span class="small">Rotina</span><strong>${data.profile.frequency}x por semana · ${data.profile.time} · ${data.profile.duration} min</strong></div><div class="profile-line"><span class="small">Dias</span><strong>${escapeHtml((data.profile.days || []).join(', ') || 'Não informado')}</strong></div><div class="profile-line"><span class="small">Deslocamento</span><strong>${escapeHtml(data.profile.commuteTime)} · ${escapeHtml(data.profile.transport)}</strong></div><div class="profile-line"><span class="small">Meu porquê</span><strong>${escapeHtml(data.profile.motivation || data.profile.goal)}</strong></div><div class="profile-line"><span class="small">Nível de disciplina</span><strong>${escapeHtml(data.profile.disciplineLevel)}</strong></div><div class="profile-line"><span class="small">Objeções</span><strong>${escapeHtml((data.profile.objections || [data.profile.objection]).join(', '))}</strong></div><div class="profile-line"><span class="small">Minha dificuldade</span><strong>${escapeHtml(data.profile.difficulty)}</strong></div><div class="profile-line"><span class="small">Contexto</span><strong>Trabalho: ${data.profile.workStatus} · Estudos: ${data.profile.studyStatus} · Filhos: ${data.profile.hasChildren}</strong></div></div><button type="button" class="secondary" style="width:100%;margin-top:16px" data-close-profile-details>Fechar</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close-profile-details]').forEach(button => button.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
}
function renderProfile() { return `<section class="screen">${header('Sobre você', 'PERFIL')}${renderProfileIdentityHeader()}<div class="section-title"><h3>Preferências</h3></div><div class="card"><div class="profile-line"><span>Notificações${nativeBluetoothSupported ? '<br><span class="small" style="font-weight:400">Lembrete de treino já funciona no app. Outros avisos: abra pelo Chrome.</span>' : ''}</span><button class="status-pill notification-button" data-notifications>${data.profile.notificationsEnabled ? 'desativar' : 'ativar'}</button></div><div class="profile-line"><span>Privacidade</span><span class="small">somente você</span></div></div><div class="section-title"><h3>Conectar dispositivos</h3></div><div class="card device-card">${renderHeartRateDeviceRow()}<div class="device-row"><div class="device-icon" aria-hidden="true">📶</div><div class="device-copy"><strong>Check-in por NFC</strong><p class="small">Aproxime o celular de uma tag na academia e o check-in acontece sozinho.</p></div><span class="status-pill status-neutral">Em breve</span></div><button class="secondary" data-device-notify>Avisar sobre o NFC quando estiver disponível</button></div><div class="section-title"><h3>Voz do Companheiro</h3></div><div class="card voice-card"><p class="small">Escolha o tom de voz que você prefere ouvir.</p><select id="voice-preference" class="text-input">${TTS_VOICE_LABELS.map(([value, label]) => `<option value="${value}" ${data.profile.voicePreference === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="secondary" style="margin-top:10px" data-test-voice>▶ Testar esta voz</button></div>${renderProfileMenu()}</section>`; }

function addMessage(from, text) { data.messages.push({ from, text }); save(); syncMessageToBackend(from, text); }
function contextualFallbackResponse(text) {
  const lower = String(text || '').toLowerCase();
  const name = data.profile.name;
  data.session.conversationStep = data.session.conversationStep || 0;
  if (lower.includes('ainda nao') || lower.includes('ainda não')) { data.session.conversationStep = 1; return 'O que est\u00e1 te segurando?'; }
  if (lower.includes('cansad')) { data.session.conversationStep = 2; return 'Cansado fisicamente ou sem vontade de come\u00e7ar?'; }
  if (lower.includes('sem vontade') || lower.includes('pregui')) { data.session.conversationStep = 3; return 'Ent\u00e3o n\u00e3o vamos pensar no treino inteiro. S\u00f3 coloca a roupa e o t\u00eanis. Depois voc\u00ea me responde.'; }
  if (lower === 'ta' || lower === 'tá') { data.session.conversationStep = 4; return 'Pronto. Roupa colocada.'; }
  if (lower.includes('pronto')) { data.session.conversationStep = 5; return 'Boa. Agora voc\u00ea j\u00e1 venceu a parte mais dif\u00edcil: come\u00e7ar.'; }
  if (lower.includes('sai') || lower.includes('sa\u00ed') || lower === 'sim') { data.session.conversationStep = 6; data.session.confirmed = true; data.session.status = 'LEFT'; return 'Ent\u00e3o agora \u00e9 s\u00f3 chegar l\u00e1. Vai.'; }
  return fallbackResponse(text);
}

function fallbackResponse(text) {
  const lower = text.toLowerCase(); const name = data.profile.name; let response = `Estou aqui com você, ${name}. O que está te segurando agora?`;
  if (lower.includes('sozinho') || lower.includes('sozinha') || lower.includes('companhia')) response = `Entendi, ${name}. Você não precisa fazer isso sozinho. Vou procurar alguém com ritmo parecido para vocês começarem com segurança.`;
  else if (lower.includes('cansad')) response = `Entendi, ${name}. É cansaço físico ou falta de vontade de começar?`;
  else if (lower.includes('sem vontade') || lower.includes('pregui')) response = `Vamos deixar pequeno, ${name}: roupa e tênis. Depois você decide o próximo passo.`;
  else if (lower.includes('tempo')) response = `Hoje parece falta de tempo, não falta de disciplina, ${name}. Quer fazer menos tempo ou remarcar?`;
  else if (lower.includes('frio')) response = `Eu sei, ${name}. Vamos fazer um acordo: chega até a porta. Depois você decide.`;
  else if (lower.includes('chuva')) response = `Chuva muda o plano, não significa fracasso. Quer adaptar em casa ou remarcar?`;
  else if (lower.includes('filho') || lower.includes('trabalho')) response = `Entendi, ${name}. Existe outro horário possível hoje? Seu treino pode mudar de horário sem ser cancelado.`;
  else if (lower.includes('dor') || lower.includes('mal')) response = `Se você está com dor ou não está bem, ${name}, não quero que se force. Cuide de você primeiro.`;
  else if (lower.includes('preparar')) { data.session.status = 'PREPARING_TO_GO'; response = `Boa, ${name}. Um passo de cada vez. Quando estiver na porta, me avisa.`; }
  else if (lower.includes('sai')) { data.session.status = 'LEFT'; response = `Boa, ${name}. Agora é só chegar lá. Eu fico com você.`; }
  return response;
}
function liveMomentContext() {
  const now = Date.now();
  const recentPulses = (data.community.pulses || []).filter(pulse => now - pulse.at < 20000).map(pulse => pulse.message);
  const presenceEntries = Object.values(data.community.presence || {}).filter(entry => now - entry.at < 45 * 60000);
  const onlineConnections = (data.community.connections || []).filter(item => item.status === 'ACCEPTED' && item.online).length;
  const workoutElapsedSeconds = data.session.startedAtClient && LIVE_WORKOUT_STATES.includes(data.session.status) ? Math.floor((now - data.session.startedAtClient) / 1000) : null;
  return { people_training_now: presenceEntries.length, recent_community_pulses: recentPulses, connections_online_now: onlineConnections, workout_elapsed_seconds: workoutElapsedSeconds, app_usage_seconds: data.usage?.totalSeconds || 0 };
}
async function fetchAiOpeningMessage() {
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!AI_ENDPOINT || !authToken || !data.profile.activity) return null;
  try {
    const response = await fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ profile: data.profile, session: data.session, messages: [], live_context: liveMomentContext(), local_time: new Date().toISOString(), message: 'Comece nossa conversa de hoje com uma saudação breve e calorosa, chamando pelo nome, e pergunte como estou me sentindo para o treino de hoje.' }) });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.source === 'fallback' || !result.response_text) return null;
    return safeCompanionResponse(result.response_text);
  } catch { return null; }
}
function refreshOpeningGreeting() {
  fetchAiOpeningMessage().then(text => {
    if (!text) return;
    data.messages[0] = { from: 'app', text };
    save();
    if (currentView === 'chat') render();
  });
}
async function requestAiResponse(text) {
  const analysis = rememberMessage(text);
  const liveContext = liveMomentContext();
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!AI_ENDPOINT || !authToken) return { response_text: contextualFallbackResponse(text), ...analysis };
  try {
    const response = await fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ profile: data.profile, session: data.session, messages: data.messages.slice(-12), memory: data.memory, rewards: data.rewards, live_context: liveContext, local_time: new Date().toISOString(), analysis }) });
    if (!response.ok) throw new Error('AI service unavailable');
    const result = await response.json();
    if (!result.response_text) throw new Error('Empty AI response');
    const responseText = result.source === 'fallback' ? contextualFallbackResponse(text) : result.response_text;
    return { ...result, response_text: safeCompanionResponse(responseText) };
  } catch {
    return { response_text: contextualFallbackResponse(text), ...analysis };
  }
}
async function replyTo(text) {
  if (/\b(fui|completei)\b/i.test(text)) { addMessage('user', text); completeSession(); return; }
  addMessage('user', text); awardPoints(3, 'você conversou'); render();
  const response = await requestAiResponse(text);
  if (response.intent === 'community' || response.objection === 'companhia') currentView = 'community';
  if (response.intent === 'commitment' || response.objection === 'preparação' || response.objection === 'saída') { data.session.confirmed = true; data.session.status = response.objection === 'saída' ? 'LEFT' : 'PREPARING_TO_GO'; }
  if (response.intent === 'resistance' || response.intent === 'constraint') data.session.status = 'OBJECTION';
  if (response.suggested_state && ['ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'LEFT'].includes(response.suggested_state)) data.session.status = response.suggested_state;
  addMessage('app', safeCompanionResponse(response.response_text)); save(); syncSessionStatusWithBackend(); render();
}
function completeSession() {
  if (data.session.status === 'COMPLETED') return;
  if (data.session.startedAtClient) data.session.actualDurationSeconds = Math.max(0, Math.floor((Date.now() - data.session.startedAtClient) / 1000));
  data.session.status = 'COMPLETED'; syncSessionStatusWithBackend(); data.rewards.streak += 1;
  if (data.session.rescueOpportunity && !data.session.rescued) { data.session.rescued = true; data.analytics.rescues += 1; }
  data.session.completedAt = new Date().toISOString();
  data.history.unshift({ date: currentDateLabel(), dateKey: todayKey(), activity: data.profile.activity, time: data.profile.time, status: 'COMPLETED', feeling: data.session.feeling || null, durationSeconds: data.session.actualDurationSeconds || null });
  // Terminar o treino de verdade e o "check-in" da meta do dia/semana eram
  // duas acoes independentes -- completar o treino nao contava pro grafico
  // da semana a nao ser que a pessoa tambem tocasse "Fazer check-in" a
  // parte no card do desafio. Meta de mes/ano ja usava o historico real
  // (data.history) pra contar; agora dia/semana tambem contam sozinhos.
  data.community.challengeJoined = true;
  if (data.community.checkedInDate !== todayKey()) {
    data.community.checkedInDate = todayKey();
    data.community.challengeProgress = Math.min(7, (Number(data.community.challengeProgress) || 0) + 1);
  }
  addMessage('app', 'Sabia que você conseguiria.');
  addMessage('app', 'Mais um treino feito. Não foi sobre vontade. Foi sobre aparecer.');
  awardPoints(40, 'treino concluído'); render();
}

function renderSummaryV3() {
  return `<section class="screen summary-screen"><div class="brand-row"><div class="logo"><span class="logo-mark">✦</span> companheiro</div><span class="eyebrow">PERFIL PRONTO</span></div><div class="summary-hero"><div class="hero-shape"></div><h1>Ja entendi um pouco sobre voce.</h1><p class="lead">Nos dias de treino, eu vou estar aqui para ajudar voce a nao desistir.</p></div><div class="card summary-card"><div class="profile-line"><span class="small">Atividade</span><strong>${escapeHtml(data.profile.activity)} · ${data.profile.frequency}x por semana</strong></div><div class="profile-line"><span class="small">Horario</span><strong>${escapeHtml(data.profile.time)}</strong></div><div class="profile-line"><span class="small">Principal dificuldade</span><strong>${escapeHtml(data.profile.difficulty)}</strong></div><div class="profile-line"><span class="small">Objetivo</span><strong>${escapeHtml(data.profile.motivation || data.profile.goal)}</strong></div></div><div class="first-session-banner"><span aria-hidden="true">✓</span><div><strong>Seu primeiro treino esta marcado.</strong><p>Eu vou lembrar de estar com voce no horario combinado.</p></div></div><button class="primary summary-cta" data-enter-app>Fechado. Vamos nessa. <span>→</span></button></section>`;
}

function renderRoutineV3() {
  const routines = data.profile.routines || [];
  const dayLabels = { Segunda: 'SEG', 'Ter\u00e7a': 'TER', Quarta: 'QUA', Quinta: 'QUI', Sexta: 'SEX', 'S\u00e1bado': 'SAB', Domingo: 'DOM' };
  return `<section class="screen routine-screen">${header('Minha rotina', 'ROTINA')}<p class="lead">Um plano que cabe na sua vida. Ajuste quando precisar.</p>${renderModalityPanel(data.profile.activity, 'routine')}<div class="routine-list">${routines.map(routine => `<article class="card routine-card ${routine.active ? '' : 'routine-paused'}"><div class="routine-card-head"><div class="routine-activity"><div class="activity-mark" aria-hidden="true">${sportIcon(routine.activity)}</div><div><h3>${escapeHtml(routine.activity)}</h3><span class="status-pill status-${routine.active ? 'active' : 'neutral'}">${routine.active ? 'Ativa' : 'Pausada'}</span></div></div><button class="icon-button" data-routine-edit="${routine.id}" aria-label="Editar ${escapeHtml(routine.activity)}">✎</button></div><div class="routine-meta"><div><span class="small">Dias</span><strong>${routine.days.map(day => dayLabels[day] || day.slice(0, 3).toUpperCase()).join(' · ')}</strong></div><div><span class="small">Horário</span><strong>${escapeHtml(routine.time)}</strong></div><div><span class="small">Duração</span><strong>${routine.duration} min</strong></div></div><div class="routine-context"><span>Local: ${escapeHtml(routine.location || 'Não informado')}</span><span>Chegada: ${escapeHtml(routine.commuteTime || 'Não informado')} · ${escapeHtml(routine.transport || 'Não informado')}</span></div><div class="routine-card-actions"><button class="secondary" data-routine-toggle="${routine.id}">${routine.active ? 'Pausar' : 'Ativar'}</button><button class="secondary" data-routine-delete="${routine.id}" ${routines.length === 1 ? 'disabled title="Mantenha pelo menos uma rotina"' : ''}>Excluir</button></div></article>`).join('')}</div><button class="primary routine-add-button" data-routine-add>+ Adicionar treino</button><div class="section-title"><h3>Legenda da semana</h3></div><div class="card routine-note"><strong>Próximo passo</strong><p class="small">Suas sessões aparecem na Home conforme o horário de cada rotina ativa.</p></div></section>`;
}

function renderNavMvp() {
  return `<nav class="bottom-nav" aria-label="Navegacao principal">${[['home','Inicio'],['today','Treino'],['map','Mapa'],['routine','Rotina'],['community','Comunidade'],['profile','Perfil']].map(([id, label]) => `<button class="nav-item ${id === 'map' ? 'nav-item-map' : ''} ${currentView === id ? 'active' : ''}" data-view="${id}" aria-current="${currentView === id ? 'page' : 'false'}"><span aria-hidden="true">${icon(id)}</span>${label}</button>`).join('')}</nav>`;
}

function feedPosts() {
  const activity = data.profile.activity;
  const posts = data.community.posts || [];
  return posts.filter(post => post.activity === activity || post.activity === 'Todas' || posts.length < 3);
}

const GOAL_PERIOD_LABELS = { day: 'Dia', week: 'Semana', month: 'Mês', year: 'Ano' };
function goalPeriodInfo(period) {
  const weeklyGoal = Number(data.profile.frequency) || 3;
  const targets = { day: 1, week: 7, month: Math.max(4, weeklyGoal * 4), year: Math.max(12, weeklyGoal * 48) };
  const completedWithin = days => data.history.filter(item => item.status === 'COMPLETED' && item.dateKey && (Date.now() - new Date(item.dateKey).getTime()) <= days * 86400000).length;
  const progress = { day: data.community.checkedInDate === todayKey() ? 1 : 0, week: Math.min(7, Number(data.community.challengeProgress) || 0), month: completedWithin(30), year: completedWithin(365) };
  return { target: targets[period], progress: Math.min(targets[period], progress[period]) };
}
function renderFeed() {
  const posts = feedPosts();
  const completed = data.history.filter(item => item.status === 'COMPLETED').length;
  const initials = String(data.profile.name || 'Voce').trim().charAt(0).toUpperCase();
  const checkedIn = data.community.checkedInDate === todayKey();
  const challengeProgress = Math.min(7, Number(data.community.challengeProgress) || 0);
  const goalInfo = goalPeriodInfo(data.community.goalPeriod);
  return `<section class="screen feed-screen">${header('Seu movimento', 'INICIO')}${renderPresenceStories()}${renderPulseStrip()}<div class="feed-hero"><div><span class="eyebrow">SEU PROXIMO PASSO</span><h1>Hoje voce pode mudar o seu dia.</h1><p>Um pequeno treino, uma escolha e uma comunidade inteira torcendo por voce.</p><div class="feed-hero-actions"><button class="primary" data-view="today">Comecar meu treino</button><button class="hero-link" data-view="community">Encontrar companhia</button></div></div><div class="feed-hero-mark">${sportIcon()}</div></div><button class="assistant-card" data-view="chat"><span class="assistant-copy"><strong>Companheiro, seu assistente</strong><span class="small">Converse quando precisar de um empurrão.</span></span><span class="assistant-spark" aria-hidden="true">✦</span></button><div class="motivation-card"><div class="eyebrow">PARA HOJE</div><p>${motivationText()}</p><div class="motivation-actions"><button class="audio-button" data-new-motivation>↻ Outra frase</button><button class="audio-button" data-speak>▶ Ouvir em voz humana</button></div></div><div class="impact-card card"><div class="impact-copy"><span class="eyebrow">META DE HOJE</span><h2>So apareca por ${data.profile.duration || 20} minutos.</h2><p>Voce nao precisa estar motivado. Precisa apenas comecar.</p></div><button class="impact-check" data-view="today" aria-label="Comecar meta de hoje">${completed ? 'Feito' : 'Ir'}</button></div><div class="challenge-card card"><div class="challenge-period-tabs">${['day','week','month','year'].map(p => `<button class="period-tab ${data.community.goalPeriod===p?'selected':''}" data-goal-period="${p}">${GOAL_PERIOD_LABELS[p]}</button>`).join('')}</div><div><span class="eyebrow">SUA META</span><h2>${goalInfo.progress}/${goalInfo.target} presencas</h2><p class="small">Faca um check-in todos os dias. Sem perfeicao, so continuidade.</p></div><div class="challenge-side"><button class="secondary" data-challenge-check ${checkedIn ? 'disabled' : ''}>${checkedIn ? 'Check-in feito' : data.community.challengeJoined ? 'Fazer check-in' : 'Participar'}</button></div><div class="challenge-progress"><span style="width:${Math.min(100, (goalInfo.progress / goalInfo.target) * 100)}%"></span></div></div><div class="stat-pills"><div class="stat-pill-chip"><span class="stat-pill-icon">🔥</span><strong>${data.rewards.streak}</strong><span class="stat-pill-label">dias</span></div><div class="stat-pill-chip"><span class="stat-pill-icon">⚡</span><strong>${data.rewards.points}</strong><span class="stat-pill-label">pontos</span></div><div class="stat-pill-chip"><span class="stat-pill-icon">✓</span><strong>${completed}</strong><span class="stat-pill-label">feitos</span></div><div class="stat-pill-chip"><span class="stat-pill-icon">👥</span><strong>${posts.length}</strong><span class="stat-pill-label">no feed</span></div></div><form class="post-composer card" id="post-form"><div class="composer-head"><div class="profile-avatar">${initials}</div><div><strong>Compartilhe seu momento</strong><span class="small">A comunidade ${escapeHtml(data.profile.activity)} esta com voce.</span></div></div><textarea id="post-text" class="text-input post-text" name="text" maxlength="280" placeholder="Como foi seu treino hoje?" required></textarea><div class="composer-actions"><span class="small">Ate 280 caracteres</span><button class="primary" type="submit">Publicar</button></div></form><div class="feed-toolbar"><div><span class="eyebrow">FEED DA COMUNIDADE</span><h2>Para voce</h2></div><button class="secondary feed-filter" data-view="community">Encontrar pessoas</button></div><div class="feed-list">${posts.map(post => `<article class="feed-post card" data-post-id="${post.id}"><div class="post-head"><div class="post-avatar">${sportIcon(post.activity)}</div><div class="post-author"><strong>${escapeHtml(post.author)}</strong><span class="small">${escapeHtml(post.activity)} · ha ${post.minutes} min</span></div><button class="post-more" aria-label="Mais opcoes">...</button></div><p class="post-copy">${escapeHtml(post.text)}</p><div class="post-meta"><span>${post.likes} curtidas</span><span>${post.comments} comentarios</span></div><div class="post-actions"><button class="post-action ${post.liked ? 'liked' : ''}" data-like-post="${post.id}">${post.liked ? 'Curtido' : 'Curtir'}</button><button class="post-action" data-comment-post="${post.id}">Comentar</button><button class="post-action" data-share-post="${post.id}">Compartilhar</button></div></article>`).join('') || '<div class="card empty-feed"><strong>Seu feed esta pronto.</strong><p class="small">Publique o primeiro momento da sua modalidade.</p></div>'}</div></section>`;
}

function renderChatV2() {
  const scale = data.session.journey.t30 && !data.session.willingness ? `<div class="will-scale"><span class="small">Como esta sua vontade de ir hoje?</span><div>${Array.from({ length: 11 }, (_, score) => `<button data-willingness="${score}">${score}</button>`).join('')}</div></div>` : '';
  const quickReplies = ['Ainda n\u00e3o', 'Estou cansado', 'Estou sem vontade', 'Estou atrasado', 'Estou sem tempo', 'Est\u00e1 frio', 'Est\u00e1 chovendo', 'Aconteceu alguma coisa', 'Vou me preparar', 'Pronto', 'J\u00e1 sa\u00ed', 'Fui'];
  return `<section class="screen chat-wrap"><div class="chat-topline"><div class="companion-avatar" aria-hidden="true">✦</div><div class="chat-heading"><div class="eyebrow">COMPANHEIRO ONLINE</div><h2>Estou com voce</h2><span class="small">Uma conversa por vez</span></div><button class="icon-button" data-view="today" aria-label="Fechar conversa">×</button></div><div class="chat-live-strip"><div class="workout-timer-badge" data-workout-timer-badge hidden><span class="workout-timer-dot"></span>Treino em andamento · <strong data-workout-timer>00:00</strong></div></div><div class="chat-messages" aria-live="polite">${data.messages.map((message, index) => `<div class="message-row ${message.from === 'user' ? 'message-user' : 'message-app'}">${message.from === 'user' ? '' : '<div class="message-avatar" aria-hidden="true">✦</div>'}<div class="bubble ${message.from === 'user' ? 'user' : 'app'}">${escapeHtml(message.text)}<div class="bubble-foot"><time>${message.from === 'user' ? 'voce' : 'agora'}</time>${message.from === 'user' ? '' : `<button type="button" class="bubble-listen" data-listen-message="${index}" aria-label="Ouvir esta mensagem">🔊</button>`}</div></div></div>`).join('')}</div>${scale}<div class="quick-reply-label small">Respostas rapidas</div><div class="quick-replies">${quickReplies.map(item => `<button data-reply="${item}">${item}</button>`).join('')}</div><div class="chat-actions"><button class="secondary" data-whatsapp>Compartilhar motivacao ↗</button></div><form class="chat-form" id="chat-form"><label class="sr-only" for="chat-message">Escreva uma mensagem</label><input id="chat-message" class="text-input" name="message" placeholder="Fale comigo..." autocomplete="off" /><button class="send" aria-label="Enviar mensagem">${icon('send')}</button></form></section>`;
}

let serverEvents = null;
async function loadServerEvents() {
  try { serverEvents = await apiRequest('/api/events/mine'); } catch { serverEvents = []; toast('Não consegui buscar os eventos agora'); }
  if (currentView === 'admin') render();
}
function renderAdmin() {
  const events = data.analytics.events || [];
  const completed = data.history.filter(item => item.status === 'COMPLETED').length;
  const opportunities = data.analytics.rescueOpportunities || 0;
  return `<section class="screen admin-screen">${header('Validação do MVP', 'PAINEL DEV')}<p class="lead">Visão rápida para acompanhar se o Companheiro está ajudando a pessoa a começar.</p><div class="admin-grid"><div class="card admin-stat"><span class="small">Treinos feitos</span><strong>${completed}</strong></div><div class="card admin-stat"><span class="small">Oportunidades</span><strong>${opportunities}</strong></div><div class="card admin-stat"><span class="small">Resgates</span><strong>${data.analytics.rescues || 0}</strong></div><div class="card admin-stat"><span class="small">Taxa de resgate</span><strong>${rescueRate()}%</strong></div></div><div class="section-title"><h3>Eventos registrados</h3></div><div class="card admin-events">${events.length ? events.slice(-12).reverse().map(event => `<div class="admin-event"><strong>${escapeHtml(event.event_name)}</strong><span class="small">${new Date(event.created_at).toLocaleString('pt-BR')}</span></div>`).join('') : '<p class="small">Os eventos do onboarding e da jornada aparecerão aqui.</p>'}</div><div class="section-title"><h3>Eventos do app Dana (servidor)</h3></div><div class="card admin-events"><button class="secondary" style="width:100%;margin-bottom:10px" data-load-server-events>Buscar meus últimos eventos</button>${serverEvents === null ? '<p class="small">Toque no botão acima depois de usar o app Dana no celular.</p>' : serverEvents.length ? serverEvents.map(event => `<div class="admin-event"><strong>${escapeHtml(event.event_name)}</strong><span class="small">${new Date(event.created_at).toLocaleString('pt-BR')}${event.metadata && Object.keys(event.metadata).length ? ' · ' + escapeHtml(JSON.stringify(event.metadata)) : ''}</span></div>`).join('') : '<p class="small">Nenhum evento do app Dana ainda.</p>'}</div><div class="section-title"><h3>Objeções mais frequentes</h3></div><div class="card">${Object.entries(data.memory.objections || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => `<div class="admin-event"><strong>${escapeHtml(key)}</strong><span class="status-pill status-conversation">${count}x</span></div>`).join('') || '<p class="small">Nenhuma objeção registrada ainda.</p>'}</div><div class="section-title"><h3>Consentimento de voz</h3></div><div class="card voice-admin-card"><p class="small">Atualize somente o nome de um consentimento já criado na OpenAI. A chave fica protegida no backend.</p><label class="field-label" for="voice-consent-id">ID do consentimento</label><input id="voice-consent-id" class="text-input" placeholder="cons_1234" autocomplete="off" /><label class="field-label" for="voice-consent-name">Novo nome</label><input id="voice-consent-name" class="text-input" placeholder="Nome da pessoa" autocomplete="name" /><label class="field-label" for="admin-token">Token do painel</label><input id="admin-token" class="text-input" type="password" placeholder="dev-admin-token" autocomplete="off" /><button class="secondary" data-update-voice-consent>Atualizar consentimento</button><p class="small" data-voice-consent-status aria-live="polite"></p></div></section>`;
}

function renderCustomizeV2() {
  const c = data.customization;
  const sports = sportCatalog;
  return `<section class="screen customize-screen">${header('Modele seu app', 'SEU ESTILO')}<p class="lead">Escolha seu esporte e o visual que combinam com voce. Tudo fica salvo neste aparelho.</p><div class="custom-preview"><div class="logo"><span class="logo-mark sport-logo-mark">${sportIcon(c.sport)}</span> <strong>${escapeHtml(c.appName)}</strong></div><div class="preview-sport">${sportIcon(c.sport)} ${escapeHtml(c.sport)}</div><div class="preview-bubble">Hoje tem ${escapeHtml(c.sport)}. Vamos comecar?</div><span class="status-pill">previa ao vivo</span></div>${renderModalityPanel(c.sport, 'customize')}<div class="section-title"><h3>Nome do app</h3></div><div class="card"><label class="field-label" for="custom-app-name">Como quer chamar seu companheiro?</label><input id="custom-app-name" class="text-input" maxlength="24" value="${escapeHtml(c.appName)}" placeholder="Ex.: Meu Ritmo" /></div><div class="section-title"><h3>Seu esporte principal</h3></div><div class="choice-grid custom-sports">${sports.map(sport => `<button class="choice ${c.sport === sport ? 'selected' : ''}" data-custom-sport="${sport}"><span class="sport-choice-icon" aria-hidden="true">${sportIcon(sport)}</span>${sport}</button>`).join('')}</div><div class="section-title"><h3>Layout e cores</h3></div><div class="card"><label class="field-label" for="custom-theme">Tema</label><select id="custom-theme" class="text-input"><option value="light" ${c.theme === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${c.theme === 'dark' ? 'selected' : ''}>Escuro</option></select><span class="field-label">Cor de destaque</span><div class="accent-grid"><button class="accent-option accent-green ${c.accent === 'green' ? 'selected' : ''}" data-custom-accent="green">Verde</button><button class="accent-option accent-blue ${c.accent === 'blue' ? 'selected' : ''}" data-custom-accent="blue">Azul</button><button class="accent-option accent-orange ${c.accent === 'orange' ? 'selected' : ''}" data-custom-accent="orange">Laranja</button><button class="accent-option accent-pink ${c.accent === 'pink' ? 'selected' : ''}" data-custom-accent="pink">Rosa</button><button class="accent-option accent-purple ${c.accent === 'purple' ? 'selected' : ''}" data-custom-accent="purple">Roxo</button></div></div><button class="primary" style="width:100%;margin-top:18px" data-save-customization>Aplicar meu estilo</button></section>`;
}


function renderHistoryV2() {
  const historyForActivity = data.history.filter(item => item.activity === data.profile.activity);
  const items = historyForActivity.length ? historyForActivity : [{ date: 'Hoje', activity: data.profile.activity, status: 'PENDING', reason: 'Seu primeiro registro aparece aqui.' }];
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
  const monday = new Date();
  const currentDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - currentDay + 1);
  const calendar = labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const item = historyItemForDay(date);
    const status = item?.status || 'PENDING';
    const mark = status === 'COMPLETED' ? '&#10003;' : status === 'RESCHEDULED' ? '&#8635;' : '&middot;';
    return `<div class="calendar-day"><span>${label}</span><strong class="calendar-dot ${status.toLowerCase()}">${mark}</strong></div>`;
  }).join('');
  return `<section class="screen">${header('Seu historico', 'HISTORICO')}<p class="lead">Sem cobranca. So um jeito de perceber que voce esta aparecendo.</p>${renderEvolutionChart()}<div class="section-title"><h3>Esta semana</h3></div><div class="card history-calendar">${calendar}</div><div class="history-legend"><span>realizado</span><span>nao realizado</span><span>remarcado</span></div><div class="section-title"><h3>Atividades recentes</h3></div><div class="card">${items.map(item => `<div class="history-item"><div class="history-icon ${item.status === 'COMPLETED' ? 'done' : 'pending'}">${item.status === 'COMPLETED' ? '&#10003;' : '&middot;'}</div><div style="flex:1"><h3>${escapeHtml(item.activity)}</h3><p class="small">${escapeHtml(item.date)} · ${item.status === 'COMPLETED' ? 'Realizado' : escapeHtml(item.reason || item.status)}</p></div><span class="small">${item.status === 'COMPLETED' ? 'feito' : 'pausa'}</span></div>`).join('')}</div></section>`;
}

function openModal({ title, message, fields = [], confirmText = 'Salvar', cancelText = 'Cancelar', danger = false }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><h3>${escapeHtml(title)}</h3>${message ? `<p class="small">${escapeHtml(message)}</p>` : ''}${fields.map(field => `<label class="field-label" for="modal-${field.id}">${escapeHtml(field.label)}</label>${field.type === 'select' ? `<select id="modal-${field.id}" class="text-input">${(field.options || []).map(option => `<option value="${escapeHtml(option)}" ${option === field.value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>` : `<input id="modal-${field.id}" class="text-input" type="${field.type || 'text'}" value="${escapeHtml(field.value ?? '')}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} />`}`).join('')}<div class="modal-actions"><button type="button" class="secondary" data-modal-cancel>${escapeHtml(cancelText)}</button><button type="button" class="${danger ? 'danger-action modal-danger' : 'primary'}" data-modal-confirm>${escapeHtml(confirmText)}</button></div></div>`;
    document.body.appendChild(overlay);
    const fitToKeyboard = () => {
      if (!window.visualViewport) return;
      overlay.style.height = `${window.visualViewport.height}px`;
      const sheet = overlay.querySelector('.modal-sheet');
      if (sheet) sheet.style.maxHeight = `${Math.max(160, window.visualViewport.height - 24)}px`;
    };
    fitToKeyboard();
    window.visualViewport?.addEventListener('resize', fitToKeyboard);
    overlay.querySelectorAll('input, select').forEach(field => field.addEventListener('focus', () => window.setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250)));
    const close = result => { window.visualViewport?.removeEventListener('resize', fitToKeyboard); overlay.remove(); resolve(result); };
    overlay.querySelector('[data-modal-cancel]').addEventListener('click', () => close(null));
    overlay.addEventListener('click', event => { if (event.target === overlay) close(null); });
    overlay.querySelector('[data-modal-confirm]').addEventListener('click', () => {
      if (!fields.length) { close(true); return; }
      const values = {};
      fields.forEach(field => { values[field.id] = overlay.querySelector(`#modal-${field.id}`)?.value ?? ''; });
      close(values);
    });
    window.setTimeout(() => (overlay.querySelector('input') || overlay.querySelector('[data-modal-confirm]'))?.focus(), 30);
  });
}
function openConfirm(title, message, { danger = false, confirmText = 'Confirmar' } = {}) { return openModal({ title, message, confirmText, danger }).then(result => result === true); }
function openLocationPickerModal() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="location-picker-sheet" role="dialog" aria-modal="true" aria-label="Escolher local no mapa"><div class="location-picker-head"><h3>Escolher local no mapa</h3><p class="small">Mova o mapa até o ponto de encontro, igual no WhatsApp.</p></div><div id="location-picker-map" style="position:relative;height:100%"><span class="location-picker-pin" aria-hidden="true">📍</span></div><div class="location-picker-foot"><span class="location-picker-address small" data-picker-address>Buscando sua localização...</span><div class="location-picker-actions"><button type="button" class="secondary" data-picker-cancel>Cancelar</button><button type="button" class="primary" data-picker-confirm>Usar este local</button></div></div></div>`;
    document.body.appendChild(overlay);
    const current = { lat: -14.235, lng: -51.925, name: 'Ponto em -14.235, -51.925' };
    const addressEl = overlay.querySelector('[data-picker-address]');
    let geocodeTimer = null;
    let picker = null;
    const reverseGeocode = (lat, lng) => {
      window.clearTimeout(geocodeTimer);
      addressEl.textContent = 'Buscando endereço...';
      geocodeTimer = window.setTimeout(async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
          const result = await response.json();
          current.name = (result?.display_name || '').split(',').slice(0, 3).join(',').trim() || `Ponto em ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        } catch { current.name = `Ponto em ${lat.toFixed(3)}, ${lng.toFixed(3)}`; }
        addressEl.textContent = current.name;
      }, 500);
    };
    const close = result => { picker?.remove(); overlay.remove(); resolve(result); };
    overlay.querySelector('[data-picker-cancel]').addEventListener('click', () => close(null));
    overlay.addEventListener('click', event => { if (event.target === overlay) close(null); });
    overlay.querySelector('[data-picker-confirm]').addEventListener('click', () => { if (!current.name) return; close({ name: current.name, lat: current.lat, lng: current.lng }); });
    window.setTimeout(() => {
      // Relatado como "fica tudo branco e nao entra" -- se o Leaflet falhar
      // aqui dentro (rede lenta, tile bloqueado, WebView especifico), uma
      // excecao sem tratamento travava o resto da inicializacao calada,
      // deixando so o cabecalho/rodape visiveis mas o mapa em branco pra
      // sempre. Agora qualquer falha mostra uma mensagem clara e ainda
      // deixa "Usar este local" funcionar com a posicao padrao, em vez de
      // travar a pessoa numa tela sem explicacao nenhuma.
      try {
        if (!window.L) throw new Error('leaflet_unavailable');
        picker = L.map('location-picker-map', { attributionControl: false }).setView([current.lat, current.lng], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(picker);
        const updateFromCenter = () => { const center = picker.getCenter(); current.lat = center.lat; current.lng = center.lng; reverseGeocode(center.lat, center.lng); };
        picker.on('moveend', updateFromCenter);
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(position => picker.setView([position.coords.latitude, position.coords.longitude], 15), updateFromCenter, { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 });
        else updateFromCenter();
      } catch (error) {
        addressEl.textContent = 'Não consegui carregar o mapa agora. Você pode confirmar com uma posição aproximada, ou cancelar e tentar de novo.';
        reportRenderError('location-picker', error);
      }
    }, 30);
  });
}
function showHeartBurst(rect, emoji = '❤️') {
  const heart = document.createElement('div');
  heart.className = 'heart-burst';
  heart.textContent = emoji;
  heart.style.left = `${rect.left + rect.width / 2}px`;
  heart.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(heart);
  heart.addEventListener('animationend', () => heart.remove());
}
function openJoinSuccessModal(event) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const terms = pickupEventTerms(event.activity);
  overlay.innerHTML = `<div class="modal-sheet join-success-sheet" role="dialog" aria-modal="true" aria-label="Você entrou">
    <div class="join-success-check">${sportIcon(event.activity)}</div>
    <h3>Você está dentro!</h3>
    <p class="small">${escapeHtml(event.title)} · ${escapeHtml(event.location_name)}<br>${formatEventDateTime(event.scheduled_at)}</p>
    <div class="join-success-actions">
      <button type="button" class="primary" data-join-open-chat>💬 Abrir conversa do ${terms.noun}</button>
      <button type="button" class="secondary" data-join-close>Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('[data-join-close]').addEventListener('click', close);
  overlay.addEventListener('click', evt => { if (evt.target === overlay) close(); });
  overlay.querySelector('[data-join-open-chat]').addEventListener('click', () => { close(); openPickupEventChat(event.id); });
}
function shuffleTeams(participants) {
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const mid = Math.ceil(shuffled.length / 2);
  return { teamA: shuffled.slice(0, mid), teamB: shuffled.slice(mid) };
}
function renderTeamColumns(split) {
  if (!split) return '<p class="small">Toque em "Sortear times" para dividir o grupo.</p>';
  const column = (label, team, className) => `<div class="team-column ${className}"><strong>${label}</strong>${team.map(person => `<span class="team-member-chip">${escapeHtml(person.name)}</span>`).join('') || '<span class="small">Vazio</span>'}</div>`;
  return `<div class="team-columns">${column('Time A', split.teamA, 'team-column-a')}${column('Time B', split.teamB, 'team-column-b')}</div>`;
}
function openTeamOrganizerModal(event) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const existing = data.community.teamSplits[event.id];
  overlay.innerHTML = `<div class="modal-sheet team-organizer-sheet" role="dialog" aria-modal="true" aria-label="Organizar times">
    <h3>Organizar times</h3>
    <p class="small">${event.participants.length} confirmados. O sorteio fica salvo neste aparelho; toque em "Enviar para o chat" para todo mundo ver.</p>
    <div data-team-columns>${renderTeamColumns(existing)}</div>
    <div class="modal-actions">
      <button type="button" class="secondary" data-shuffle-teams>🎲 Sortear times</button>
      <button type="button" class="primary" data-send-teams-chat ${existing ? '' : 'disabled'}>Enviar para o chat</button>
    </div>
    <button type="button" class="text-action" data-close-team-modal>Fechar</button>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('[data-close-team-modal]').addEventListener('click', close);
  overlay.addEventListener('click', evt => { if (evt.target === overlay) close(); });
  overlay.querySelector('[data-shuffle-teams]').addEventListener('click', () => {
    const split = shuffleTeams(event.participants);
    data.community.teamSplits[event.id] = { ...split, generatedAt: Date.now() };
    save();
    overlay.querySelector('[data-team-columns]').innerHTML = renderTeamColumns(split);
    overlay.querySelector('[data-send-teams-chat]').disabled = false;
  });
  overlay.querySelector('[data-send-teams-chat]').addEventListener('click', () => {
    const split = data.community.teamSplits[event.id];
    if (!split) return;
    const text = `🎲 Times sorteados:\nTime A: ${split.teamA.map(p => p.name).join(', ') || '-'}\nTime B: ${split.teamB.map(p => p.name).join(', ') || '-'}`;
    sendPickupEventMessage(event.id, text);
    close();
    toast('Times enviados para o chat do jogo');
  });
}
function bindEvents() {
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { currentView = button.dataset.view; render(); }));
  document.querySelector('#post-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#post-text');
    const text = input?.value.trim();
    if (!text) return;
    data.community.posts = data.community.posts || [];
    data.community.posts.unshift({ id: `post-${Date.now()}`, author: data.profile.name || 'Voce', activity: data.profile.activity, text, likes: 0, liked: false, comments: 0, minutes: 0 });
    try { await apiRequest('/api/social/posts', { method: 'POST', body: JSON.stringify({ text, activity: data.profile.activity }) }); } catch { /* Local post remains available offline. */ }
    save();
    render();
    toast('Publicacao feita no seu feed');
  });
  document.querySelector('[data-challenge-check]')?.addEventListener('click', () => {
    if (!data.community.challengeJoined) { data.community.challengeJoined = true; toast('Voce entrou no desafio da semana'); render(); return; }
    if (data.community.checkedInDate === todayKey()) return;
    data.community.checkedInDate = todayKey(); data.community.challengeProgress = Math.min(7, (Number(data.community.challengeProgress) || 0) + 1); awardPoints(5, 'check-in do desafio'); save(); render(); toast('Check-in registrado. Mais um dia presente.');
  });
  document.querySelectorAll('[data-goal-period]').forEach(button => button.addEventListener('click', () => { data.community.goalPeriod = button.dataset.goalPeriod; save(); render(); }));
  document.querySelectorAll('.feed-post').forEach(article => {
    let lastTap = 0;
    article.addEventListener('click', async event => {
      if (event.target.closest('button')) return;
      const now = Date.now();
      const isDoubleTap = now - lastTap < 320;
      lastTap = now;
      if (!isDoubleTap) return;
      showHeartBurst(article.getBoundingClientRect());
      const post = data.community.posts.find(item => item.id === article.dataset.postId);
      if (!post || post.liked) return;
      post.liked = true;
      post.likes += 1;
      try { await apiRequest(`/api/social/posts/${encodeURIComponent(post.id)}/like`, { method: 'POST' }); } catch { /* Local reaction remains available offline. */ }
      save();
      render();
    });
  });
  document.querySelectorAll('[data-like-post]').forEach(button => button.addEventListener('click', async () => {
    const post = data.community.posts.find(item => item.id === button.dataset.likePost);
    if (!post) return;
    post.liked = !post.liked;
    post.likes = Math.max(0, post.likes + (post.liked ? 1 : -1));
    try { await apiRequest(`/api/social/posts/${encodeURIComponent(post.id)}/like`, { method: 'POST' }); } catch { /* Local reaction remains available offline. */ }
    save();
    render();
  }));
  document.querySelectorAll('[data-comment-post]').forEach(button => button.addEventListener('click', async () => {
    const post = data.community.posts.find(item => item.id === button.dataset.commentPost);
    if (!post) return;
    const values = await openModal({ title: 'Comentar', fields: [{ id: 'comment', label: 'Escreva um comentário' }], confirmText: 'Publicar' });
    const comment = values?.comment?.trim();
    if (!comment) return;
    post.comments += 1;
    try { await apiRequest(`/api/social/posts/${encodeURIComponent(post.id)}/comments`, { method: 'POST', body: JSON.stringify({ text: comment.trim() }) }); } catch { /* Local comment count remains available offline. */ }
    save();
    toast('Comentario adicionado');
    render();
  }));
  document.querySelectorAll('[data-share-post]').forEach(button => button.addEventListener('click', async () => {
    const post = data.community.posts.find(item => item.id === button.dataset.sharePost);
    if (!post) return;
    const shareText = `${post.author}: ${post.text}`;
    if (navigator.share) await navigator.share({ title: 'Companheiro', text: shareText }).catch(() => {});
    else await navigator.clipboard?.writeText(shareText).catch(() => {});
    toast('Publicacao pronta para compartilhar');
  }));
  document.querySelector('#login-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name') || '').trim(); const payload = { name, email: String(form.get('email') || '').trim(), password: String(form.get('password') || '') }; if (!name || !payload.email || payload.password.length < 8) return; let result = null; try { try { result = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }); } catch { result = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: payload.email, password: payload.password }) }); } } catch { /* Sem conexão: segue no modo local abaixo. */ } finishAuth(result, name); if (!result) toast('Sem conexão: o acesso local continua disponível'); });
  document.querySelector('[data-guest-entry]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    const guestName = 'Visitante';
    const guestId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const payload = { name: guestName, email: `visitante-${guestId}@companheiro.app`, password: `visitante-${guestId}` };
    let result = null;
    try { result = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }); } catch { /* Sem conexão: segue no modo local abaixo. */ }
    finishAuth(result, guestName);
    if (!result) toast('Sem conexão: o acesso local continua disponível');
    else toast('Você está só explorando -- crie uma conta de verdade no Perfil quando quiser guardar seu progresso');
  });
  document.querySelector('[data-onboard-next]')?.addEventListener('click', () => { if (data.onboarded && !data.session.created) { createFirstSession(); toast('Seu primeiro treino esta marcado'); } });
  document.querySelectorAll('[data-routine-toggle]').forEach(button => button.addEventListener('click', () => { const routine = data.profile.routines.find(item => item.id === button.dataset.routineToggle); if (!routine) return; routine.active = !routine.active; if (routine.id === 'main') data.profile.activeSchedule = routine.active; save(); syncProfileWithBackend(); render(); toast(routine.active ? 'Rotina ativada' : 'Rotina pausada'); }));
  document.querySelectorAll('[data-routine-delete]').forEach(button => button.addEventListener('click', async () => { if (button.disabled) return; const ok = await openConfirm('Excluir rotina', 'Tem certeza que quer excluir esta rotina?', { danger: true, confirmText: 'Excluir' }); if (!ok) return; data.profile.routines = data.profile.routines.filter(item => item.id !== button.dataset.routineDelete); save(); syncProfileWithBackend(); render(); toast('Rotina excluída'); }));
  document.querySelectorAll('[data-routine-edit]').forEach(button => button.addEventListener('click', async () => { const routine = data.profile.routines.find(item => item.id === button.dataset.routineEdit); if (!routine) return; const values = await openModal({ title: 'Editar rotina', fields: [{ id: 'time', label: 'Horário', value: routine.time, type: 'time' }, { id: 'location', label: 'Local', value: routine.location }, { id: 'duration', label: 'Duração (minutos)', value: routine.duration, type: 'number', min: 5, max: 240 }] }); if (!values) return; routine.time = values.time || routine.time; routine.location = values.location || routine.location; routine.duration = Math.min(240, Math.max(5, Number(values.duration) || routine.duration)); if (routine.id === 'main') Object.assign(data.profile, { time: routine.time, location: routine.location, duration: routine.duration }); save(); syncProfileWithBackend(); render(); toast('Rotina atualizada'); }));
  document.querySelector('[data-routine-add]')?.addEventListener('click', async () => { const values = await openModal({ title: 'Adicionar treino', fields: [{ id: 'activity', label: 'Qual modalidade?', type: 'select', options: sportCatalog, value: data.profile.activity || sportCatalog[0] }, { id: 'time', label: 'Horário', value: data.profile.time, type: 'time' }], confirmText: 'Adicionar' }); const activity = values?.activity?.trim(); if (!activity) return; const time = values.time || data.profile.time; const routine = { id: `routine-${Date.now()}`, activity, days: [...data.profile.days], time, duration: data.profile.duration, location: data.profile.location, commuteTime: data.profile.commuteTime, transport: data.profile.transport, active: true }; data.profile.routines.push(routine); data.profile.activities = [...new Set([...(data.profile.activities || []), activity])]; save(); syncProfileWithBackend(); render(); toast('Treino adicionado'); if (sportLayout(activity).slug === 'team') { const wantsToOrganize = await openConfirm(`Organizar esse ${pickupEventTerms(activity).noun}?`, `Você pode divulgar esse horário de ${activity} no mapa pra quem tiver o app perto encontrar e completar o time com você.`, { confirmText: 'Divulgar no mapa' }); if (wantsToOrganize) openCreatePickupEventModal(); } });
  document.querySelector('[data-install-app]')?.addEventListener('click', async () => { if (!deferredInstallPrompt) { toast('Use o menu do navegador para instalar o app'); return; } deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; render(); });
  document.querySelectorAll('[data-custom-sport]').forEach(button => button.addEventListener('click', () => { data.customization.sport = button.dataset.customSport; data.profile.activity = button.dataset.customSport; data.profile.activities = [...new Set([button.dataset.customSport, ...(data.profile.activities || [])])]; data.customization.accent = sportAccent[button.dataset.customSport] || data.customization.accent; toast(`Tema ajustado para combinar com ${button.dataset.customSport}`); render(); }));
  document.querySelectorAll('[data-custom-accent]').forEach(button => button.addEventListener('click', () => { data.customization.accent = button.dataset.customAccent; applyCustomization(); render(); }));
  document.querySelector('[data-save-customization]')?.addEventListener('click', () => { const name = document.querySelector('#custom-app-name')?.value.trim(); if (name) data.customization.appName = name.slice(0, 24); data.customization.theme = document.querySelector('#custom-theme')?.value || 'light'; save(); syncProfileWithBackend(); applyCustomization(); toast('Seu app foi personalizado'); render(); });
  document.querySelector('[data-load-server-events]')?.addEventListener('click', loadServerEvents);
  document.querySelector('[data-update-voice-consent]')?.addEventListener('click', async event => { const id = document.querySelector('#voice-consent-id')?.value.trim(); const name = document.querySelector('#voice-consent-name')?.value.trim(); const token = document.querySelector('#admin-token')?.value || 'dev-admin-token'; const status = document.querySelector('[data-voice-consent-status]'); if (!id || !name) { if (status) status.textContent = 'Informe o ID e o novo nome.'; return; } event.currentTarget.disabled = true; try { const response = await fetch(`${API_ORIGIN}/api/admin/voice-consents/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ name }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'voice_consent_error'); if (status) status.textContent = `Consentimento ${result.id || id} atualizado.`; toast('Consentimento atualizado'); } catch (error) { if (status) status.textContent = error.message === 'configure_openai_api_key' ? 'Configure OPENAI_API_KEY no servidor.' : 'Não foi possível atualizar agora.'; } finally { event.currentTarget.disabled = false; } });
  document.querySelector('[data-enter-app]')?.addEventListener('click', () => { currentView = 'home'; render(); });
  document.querySelector('[data-onboard-next]')?.addEventListener('click', () => { if (onboardingStep === 2) { data.profile.frequency = Number(document.querySelector('#frequency').value) || 3; data.profile.days = [...document.querySelectorAll('input[name="training-days"]:checked')].map(input => input.value); data.profile.time = document.querySelector('#training-time').value || '19:00'; data.profile.scheduleByDay = Object.fromEntries(data.profile.days.map(day => [day, data.profile.time])); data.profile.duration = Number(document.querySelector('#training-duration').value) || 45; data.profile.commuteTime = document.querySelector('#commute-time').value; data.profile.transport = document.querySelector('#transport').value; } if (onboardingStep === 4) { data.profile.motivation = document.querySelector('#motivation').value; data.profile.goal = data.profile.motivation; data.profile.difficulty = data.profile.objection && data.profile.objection !== 'Não informado' ? data.profile.objection : 'Manter constância'; data.profile.disciplineLevel = document.querySelector('#discipline-level').value; data.profile.workStatus = document.querySelector('#work-status').value; data.profile.studyStatus = document.querySelector('#study-status').value; data.profile.hasChildren = document.querySelector('#has-children').value; } if (onboardingStep < 4) onboardingStep++; else { data.onboarded = true; awardPoints(20, 'primeiro passo'); currentView = 'summary'; refreshOpeningGreeting(); } render(); });
  document.querySelectorAll('[data-onboard-choice]').forEach(button => button.addEventListener('click', () => { if (onboardingStep === 1) { const activities = data.profile.activities || []; const selectedActivity = button.dataset.onboardChoice; data.profile.activities = activities.includes(selectedActivity) ? activities.filter(item => item !== selectedActivity) : [...activities, selectedActivity]; if (data.profile.activities.length) data.profile.activity = data.profile.activities[0]; data.customization.sport = data.profile.activity; data.customization.accent = sportAccent[data.profile.activity] || data.customization.accent; applyCustomization(); } if (onboardingStep === 3) { const objections = data.profile.objections || []; const selectedObjection = button.dataset.onboardChoice; data.profile.objections = objections.includes(selectedObjection) ? objections.filter(item => item !== selectedObjection) : [...objections, selectedObjection]; data.profile.objection = data.profile.objections[0] || 'Não informado'; } render(); }));
  document.querySelector('[data-today-action]')?.addEventListener('click', () => data.session.status === 'COMPLETED' ? (currentView = 'history', render()) : (currentView = 'chat', render()));
  document.querySelectorAll('[data-reply]').forEach(button => button.addEventListener('click', () => { const text = button.dataset.reply; if (text === 'Completei o treino') completeSession(); else replyTo(text); }));
  document.querySelectorAll('[data-connect]').forEach(button => button.addEventListener('click', () => sendConnectionRequest(button.dataset.connect)));
  document.querySelectorAll('[data-respond-connection]').forEach(button => button.addEventListener('click', () => respondConnectionRequest(button.dataset.respondConnection, button.dataset.accept === 'true')));
  document.querySelectorAll('[data-open-chat]').forEach(button => button.addEventListener('click', () => openConnectionChat(button.dataset.openChat)));
  document.querySelector('#connection-chat-form')?.addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#connection-chat-input'); const text = input?.value.trim(); if (!text) return; input.value = ''; sendConnectionMessage(data.community.activeChat, text); });
  document.querySelectorAll('[data-open-pickup-chat]').forEach(button => button.addEventListener('click', () => openPickupEventChat(button.dataset.openPickupChat)));
  document.querySelectorAll('[data-organize-team]').forEach(button => button.addEventListener('click', () => { const event = pickupEvents.find(item => item.id === button.dataset.organizeTeam); if (event) openTeamOrganizerModal(event); }));
  document.querySelector('#pickup-event-chat-form')?.addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#pickup-event-chat-input'); const text = input?.value.trim(); if (!text) return; input.value = ''; sendPickupEventMessage(data.community.activePickupEventChat, text); });
  document.querySelectorAll('[data-feedback]').forEach(button => button.addEventListener('click', () => { data.session.feeling = button.dataset.feedback; save(); syncFeedbackToBackend({ completed: true, feeling: data.session.feeling }); const status = document.querySelector('[data-feedback-status]'); if (status) status.textContent = `Sensação registrada: ${button.dataset.feedback}`; toast('Feedback salvo'); }));
  document.querySelectorAll('[data-not-completed-reason]').forEach(button => button.addEventListener('click', () => { data.session.reasonNotCompleted = button.dataset.notCompletedReason; save(); syncFeedbackToBackend({ completed: false, reason_not_completed: data.session.reasonNotCompleted }); const status = document.querySelector('[data-reason-status]'); if (status) status.textContent = `Motivo registrado: ${button.dataset.notCompletedReason}`; toast('Motivo salvo sem julgamento'); }));
  document.querySelectorAll('[data-willingness]').forEach(button => button.addEventListener('click', () => { data.session.willingness = Number(button.dataset.willingness); data.session.status = 'ENGAGED'; addMessage('user', `Minha vontade hoje é ${button.dataset.willingness}/10.`); addMessage('app', Number(button.dataset.willingness) < 5 ? 'Entendi. Vamos descobrir o que está pesando, sem pressa.' : 'Boa. Vamos transformar essa vontade em um primeiro passo.'); save(); render(); }));
  document.querySelectorAll('[data-post-training]').forEach(button => button.addEventListener('click', () => { if (button.dataset.postTraining === 'yes') completeSession(); else { data.session.status = 'NOT_COMPLETED'; addMessage('app', 'Tudo bem. Amanhã é uma nova oportunidade.'); addMessage('app', 'Quer me contar o que aconteceu?'); save(); render(); } }));
  document.querySelector('[data-whatsapp]')?.addEventListener('click', () => { const text = `Meu Companheiro: ${motivationText()}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); });
  document.querySelector('[data-share-moment]')?.addEventListener('click', () => shareMoment(`Treinei ${data.profile.activity} hoje com o Companheiro. Mais um dia que eu não desisti. 💪`));
  document.querySelector('[data-invite-friends]')?.addEventListener('click', () => shareMoment(`Bora treinar ${data.profile.activity} junto? Estou usando o Companheiro pra não desistir: ${location.origin}${location.pathname}`));
  document.querySelector('[data-speak]')?.addEventListener('click', () => { awardPoints(2, 'você se cuidou'); render(); playHumanMotivation(); });
  document.querySelectorAll('[data-listen-message]').forEach(button => button.addEventListener('click', () => { const message = data.messages[Number(button.dataset.listenMessage)]; if (message?.text) playHumanMotivation(message.text); }));
  document.querySelector('[data-new-motivation]')?.addEventListener('click', refreshMotivation);
  document.querySelector('[data-notifications]')?.addEventListener('click', async event => { if (data.profile.notificationsEnabled) { data.profile.notificationsEnabled = false; clearNotificationTimers(); event.currentTarget.textContent = 'ativar'; save(); syncProfileWithBackend(); toast('Notificações pausadas'); return; } await enableNotifications(); if (('Notification' in window) && Notification.permission === 'granted') { event.currentTarget.textContent = 'desativar'; save(); } });
  document.querySelector('#voice-preference')?.addEventListener('change', event => { data.profile.voicePreference = event.target.value; save(); syncProfileWithBackend(); });
  document.querySelector('[data-test-voice]')?.addEventListener('click', () => playHumanMotivation('Oi! Essa é a minha voz agora. Gostou?'));
  document.querySelector('[data-device-notify]')?.addEventListener('click', event => { event.currentTarget.disabled = true; event.currentTarget.textContent = 'Vamos te avisar assim que estiver pronto'; toast('Você será avisado quando o NFC estiver disponível'); });
  document.querySelector('[data-device-connect]')?.addEventListener('click', connectHeartRateMonitor);
  document.querySelector('[data-device-disconnect]')?.addEventListener('click', disconnectHeartRateMonitor);
  document.querySelector('[data-center-map]')?.addEventListener('click', centerMap);
  document.querySelector('[data-fit-meeting-map]')?.addEventListener('click', fitMeetingMap);
  document.querySelector('[data-toggle-live-location]')?.addEventListener('click', toggleLiveLocationSharing);
  document.querySelector('[data-open-map-filters]')?.addEventListener('click', openMapFiltersModal);
  document.querySelectorAll('[data-map-sport-chip]').forEach(button => button.addEventListener('click', () => { mapFilters.sport = button.dataset.mapSportChip; render(); }));
  document.querySelectorAll('[data-open-drawer]').forEach(button => button.addEventListener('click', openSportDrawer));
  document.querySelector('[data-create-pickup-event]')?.addEventListener('click', openCreatePickupEventModal);
  document.querySelectorAll('[data-pickup-event]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.pickupEvent;
    const joined = button.dataset.joined === 'true';
    const isCreator = button.dataset.creator === 'true';
    if (isCreator) {
      const ok = await openConfirm('Cancelar', 'Tem certeza que quer cancelar este encontro? Isso avisa quem já entrou.', { danger: true, confirmText: 'Cancelar encontro' });
      if (!ok) return;
    }
    button.disabled = true;
    try {
      if (isCreator) { await apiRequest(`/api/pickup-events/${id}`, { method: 'DELETE' }); toast('Encontro cancelado'); }
      else if (joined) { await apiRequest(`/api/pickup-events/${id}/join`, { method: 'DELETE' }); toast('Você saiu'); }
      else { const updated = await apiRequest(`/api/pickup-events/${id}/join`, { method: 'POST' }); showHeartBurst(button.getBoundingClientRect(), '✅'); openJoinSuccessModal(updated); }
      await loadPickupEvents();
    } catch { toast('Não foi possível agora'); button.disabled = false; }
  }));
  document.querySelectorAll('[data-meeting-point]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.meetingPoint; data.community.meetingPointIds = data.community.meetingPointIds || []; if (data.community.meetingPointIds.includes(id)) return; data.community.meetingPointIds.push(id); save(); render(); toast('Você entrou nesse ponto de encontro'); }));
  document.querySelector('#chat-form')?.addEventListener('submit', event => { event.preventDefault(); const input = event.target.message; if (input.value.trim()) replyTo(input.value.trim()); });
  document.querySelector('[data-edit-routine]')?.addEventListener('click', () => { data.profile.time = prompt('Qual será o novo horário?', data.profile.time) || data.profile.time; data.profile.location = prompt('Onde você pratica?', data.profile.location) || data.profile.location; data.profile.duration = Number(prompt('Duração em minutos?', data.profile.duration)) || data.profile.duration; save(); render(); toast('Rotina atualizada'); });
  document.querySelector('[data-toggle-routine]')?.addEventListener('click', () => { data.profile.activeSchedule = !data.profile.activeSchedule; save(); render(); toast(data.profile.activeSchedule ? 'Rotina ativada' : 'Rotina pausada'); });
  document.querySelector('[data-add-routine]')?.addEventListener('click', () => { const activity = prompt('Qual atividade adicionar?', 'Corrida'); if (!activity) return; data.profile.activities = [...new Set([...(data.profile.activities || []), activity])]; save(); render(); toast('Atividade adicionada'); });
  document.querySelector('[data-reset]')?.addEventListener('click', () => { data = { ...initialData, profile: { ...initialData.profile }, rewards: { ...initialData.rewards } }; onboardingStep = 0; currentView = 'login'; localStorage.removeItem(STORAGE_KEY); render(); });
  document.querySelector('[data-open-profile-details]')?.addEventListener('click', openProfileDetailsModal);
  document.querySelector('[data-delete-account]')?.addEventListener('click', async () => { const ok = await openConfirm('Excluir conta', 'Excluir sua conta e todos os seus dados? Esta ação não pode ser desfeita.', { danger: true, confirmText: 'Excluir tudo' }); if (!ok) return; try { await apiRequest('/api/me', { method: 'DELETE' }); } catch { /* Offline mode still removes the local copy. */ } localStorage.removeItem(AUTH_TOKEN_KEY); localStorage.removeItem(STORAGE_KEY); data = { ...initialData, profile: { ...initialData.profile }, rewards: { ...initialData.rewards }, memory: { ...initialData.memory, objections: {} }, analytics: { ...initialData.analytics, events: [] } }; currentView = 'login'; onboardingStep = 0; render(); toast('Conta e dados excluídos'); });
  document.querySelector('[data-logout]')?.addEventListener('click', () => { data.authenticated = false; save(); currentView = 'login'; render(); });
}
function sportLayout(activity = data.profile.activity) {
  const key = sportKey(activity);
  const layouts = [
    { keys: ['corrida', 'ciclismo', 'atletismo', 'triatlo', 'remo', 'canoagem', 'surf', 'natacao', 'stand-up-paddle'], data: { slug: 'endurance', tag: 'Ritmo', title: 'Modalidade de ritmo', summary: 'Layout direto para constancia, preparo rapido e recuperacao.', note: 'Menos friccao, mais repeticao.', focus: ['Aquecimento', 'Cadencia', 'Recuperacao'], metrics: [{ label: 'Foco', value: 'Ritmo' }, { label: 'Entrada', value: 'Rapida' }, { label: 'Saida', value: 'Leve' }] } },
    { keys: ['academia', 'crossfit', 'ginastica'], data: { slug: 'strength', tag: 'Forca', title: 'Modalidade de forca', summary: 'Estrutura objetiva para carga, execucao e progresso.', note: 'Pouca conversa, mais execucao.', focus: ['Carga', 'Tecnica', 'Progresso'], metrics: [{ label: 'Foco', value: 'Execucao' }, { label: 'Entrada', value: 'Aquecimento' }, { label: 'Saida', value: 'Recuperacao' }] } },
    { keys: ['yoga', 'pilates', 'danca', 'alongamento'], data: { slug: 'flow', tag: 'Fluxo', title: 'Modalidade de fluidez', summary: 'Interface leve, limpa e sem excesso de etapas.', note: 'Ritmo suave, instrucao simples.', focus: ['Respiracao', 'Mobilidade', 'Presenca'], metrics: [{ label: 'Foco', value: 'Leveza' }, { label: 'Entrada', value: 'Calma' }, { label: 'Saida', value: 'Controle' }] } },
    { keys: ['boxe', 'jiu-jitsu', 'muay-thai', 'karate', 'taekwondo', 'mma'], data: { slug: 'combat', tag: 'Combate', title: 'Modalidade de combate', summary: 'Clareza, seguranca e aquecimento em primeiro lugar.', note: 'Objetivo, firme e sem ruido.', focus: ['Aquecimento', 'Tecnica', 'Seguranca'], metrics: [{ label: 'Foco', value: 'Tecnica' }, { label: 'Entrada', value: 'Preparacao' }, { label: 'Saida', value: 'Controle' }] } },
    { keys: ['futebol', 'futsal', 'basquete', 'volei', 'handebol', 'rugby', 'beisebol', 'softbol', 'hóquei', 'hokei', 'criquete', 'polo-aquatico'], data: { slug: 'team', tag: 'Coletivo', title: 'Modalidade coletiva', summary: 'Layout pensado para grupo, horario e coordenacao.', note: 'Mais clareza para combinar com outras pessoas.', focus: ['Grupo', 'Horario', 'Coordenacao'], metrics: [{ label: 'Foco', value: 'Equipe' }, { label: 'Entrada', value: 'Alinhamento' }, { label: 'Saida', value: 'Conexao' }] } },
    { keys: ['tenis', 'beach-tennis', 'badminton', 'squash'], data: { slug: 'court', tag: 'Quadra', title: 'Modalidade de quadra', summary: 'Boa leitura de ritmo, foco e combinacao de horario.', note: 'Organizacao curta, objetiva e visivel.', focus: ['Ponto', 'Ritmo', 'Timing'], metrics: [{ label: 'Foco', value: 'Precisao' }, { label: 'Entrada', value: 'Pontualidade' }, { label: 'Saida', value: 'Repeticao' }] } },
    { keys: ['skate', 'escalada', 'patinacao'], data: { slug: 'urban', tag: 'Movimento', title: 'Modalidade de movimento', summary: 'Visual mais leve para uma experiencia dinamica e pratica.', note: 'Fluidez com controle.', focus: ['Equilibrio', 'Percurso', 'Confianca'], metrics: [{ label: 'Foco', value: 'Fluxo' }, { label: 'Entrada', value: 'Livre' }, { label: 'Saida', value: 'Estavel' }] } }
  ];
  const normalized = key.replace(/-/g, '');
  const match = layouts.find(item => item.keys.some(itemKey => normalized.includes(itemKey.replace(/-/g, ''))));
  return match?.data || { slug: 'direct', tag: 'Direto', title: 'Layout objetivo', summary: 'Uma experiencia limpa para manter foco e constancia.', note: 'Sem excesso, sem distracao.', focus: ['Planejamento', 'Horario', 'Constancia'], metrics: [{ label: 'Foco', value: 'Objetivo' }, { label: 'Entrada', value: 'Curta' }, { label: 'Saida', value: 'Simples' }] };
}
function renderModalityPanel(activity = data.profile.activity, context = 'today') {
  const layout = sportLayout(activity);
  const contextCopy = { today: 'Use este foco como guia do proximo treino.', routine: 'A rotina ganha clareza quando o layout reflete a modalidade.', customize: 'Este sera o tom visual do seu app.' }[context] || 'O layout se adapta ao seu esporte.';
  return `<div class="card modality-panel modality-${layout.slug}"><div class="modality-panel-head"><div><span class="eyebrow">${layout.tag}</span><h3>${escapeHtml(layout.title)}</h3></div><span class="status-pill">${escapeHtml(activity)}</span></div><p class="small">${escapeHtml(layout.summary)}</p><div class="modality-grid">${layout.focus.map(item => `<span class="modality-chip">${escapeHtml(item)}</span>`).join('')}</div><div class="modality-metrics">${layout.metrics.map(metric => `<div><span class="small">${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>`).join('')}</div><p class="modality-note">${escapeHtml(contextCopy)} ${escapeHtml(layout.note)}</p></div>`;
}
// Ultima rede de seguranca: um erro que escape de qualquer handler (fora do
// render()) antes so travava a tela sem nenhum aviso. Agora pelo menos fica
// registrado pra investigar depois, em vez de a pessoa achar que o app so
// "nao fez nada".
window.addEventListener('error', event => reportRenderError(currentView, event.error || event.message));
window.addEventListener('unhandledrejection', event => reportRenderError(currentView, event.reason));

render();
loadGoogleClientId();


