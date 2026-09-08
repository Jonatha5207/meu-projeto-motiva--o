import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Mantido em sincronia com o seed de `objections` em schema.sql.
const SEED_OBJECTIONS = [
  { name: 'Cansaço', category: 'energia' },
  { name: 'Preguiça', category: 'resistência' },
  { name: 'Falta de tempo', category: 'rotina' },
  { name: 'Trabalho', category: 'rotina' },
  { name: 'Filhos', category: 'contexto' },
  { name: 'Frio', category: 'ambiente' },
  { name: 'Chuva', category: 'ambiente' },
  { name: 'Falta de vontade', category: 'resistência' },
  { name: 'Desânimo', category: 'emocional' },
  { name: 'Não vejo resultado', category: 'motivação' },
  { name: 'Falta de companhia', category: 'social' },
  { name: 'Vergonha', category: 'social' },
  { name: 'Dor', category: 'segurança' },
  { name: 'Outro', category: 'outro' },
];

export function createMemoryStore({ dataDir }) {
  const dataFile = join(dataDir, 'companheiro.json');

  const users = new Map();
  const authTokens = new Map();
  const profiles = new Map();
  const userSessions = new Map();
  const analyticsEvents = [];
  const objections = SEED_OBJECTIONS.map(seed => ({ id: randomUUID(), name: seed.name, category: seed.category, active: true }));
  const userObjections = new Map();
  const feedbacks = [];
  const notifications = [];
  const deviceTokens = new Map();
  const conversations = new Map();
  const conversationMessages = new Map();
  const socialPosts = [];
  const notificationState = new Map();
  const connections = [];
  const directMessages = new Map(); // connectionId -> message[]
  const liveLocations = new Map(); // userId -> { user_id, lat, lng, activity, started_at, expires_at }
  const pickupEvents = new Map(); // eventId -> event
  const pickupEventParticipants = new Map(); // eventId -> Set(userId)

  function sessionsFor(userId) { if (!userSessions.has(userId)) userSessions.set(userId, []); return userSessions.get(userId); }
  function conversationsFor(userId) { if (!conversations.has(userId)) conversations.set(userId, []); return conversations.get(userId); }
  function stateFor(userId) { if (!notificationState.has(userId)) notificationState.set(userId, {}); return notificationState.get(userId); }
  function messagesFor(connectionId) { if (!directMessages.has(connectionId)) directMessages.set(connectionId, []); return directMessages.get(connectionId); }

  return {
    kind: 'memory',

    async getUserById(id) { return users.get(id) || null; },
    async getUserByEmail(email) { return [...users.values()].find(item => item.email === email) || null; },
    async createUser(user) { users.set(user.id, user); profiles.set(user.id, {}); return user; },
    async deleteUser(userId) {
      users.delete(userId); profiles.delete(userId); userSessions.delete(userId); userObjections.delete(userId);
      feedbacks.splice(0, feedbacks.length, ...feedbacks.filter(item => item.user_id !== userId));
      notifications.splice(0, notifications.length, ...notifications.filter(item => item.user_id !== userId));
      analyticsEvents.splice(0, analyticsEvents.length, ...analyticsEvents.filter(item => item.user_id !== userId));
      deviceTokens.forEach((item, key) => { if (item.user_id === userId) deviceTokens.delete(key); });
      const userConversations = conversations.get(userId) || [];
      userConversations.forEach(item => conversationMessages.delete(item.id));
      conversations.delete(userId);
      authTokens.forEach((id, token) => { if (id === userId) authTokens.delete(token); });
    },
    async countUsers() { return users.size; },
    async listAllUsers() { return [...users.values()]; },

    async createAuthToken(token, userId) { authTokens.set(token, userId); },
    async getUserIdByToken(token) { return authTokens.get(token) || null; },

    async getProfile(userId) { return profiles.get(userId) || {}; },
    async setProfile(userId, profile) { profiles.set(userId, profile); return profile; },

    async listSessions(userId) { return sessionsFor(userId); },
    async listAllSessions() { return [...userSessions.values()].flat(); },
    async getSession(userId, id) { return sessionsFor(userId).find(item => item.id === id) || null; },
    async createSession(session) { sessionsFor(session.user_id).push(session); return session; },
    async updateSession(userId, id, patch) {
      const session = sessionsFor(userId).find(item => item.id === id);
      if (!session) return null;
      Object.assign(session, patch);
      return session;
    },

    async listActiveObjections() { return objections.filter(item => item.active); },
    async findObjection(idOrName) {
      const name = String(idOrName || '').toLowerCase();
      return objections.find(item => item.id === idOrName || item.name.toLowerCase() === name) || null;
    },
    async recordUserObjection(userId, objectionId) {
      const links = userObjections.get(userId) || [];
      const link = links.find(item => item.objection_id === objectionId);
      if (link) { link.frequency += 1; link.last_occurred_at = new Date().toISOString(); }
      else links.push({ id: randomUUID(), user_id: userId, objection_id: objectionId, frequency: 1, last_occurred_at: new Date().toISOString(), created_at: new Date().toISOString() });
      userObjections.set(userId, links);
      return links.at(-1);
    },

    async createFeedback(feedback) { feedbacks.push(feedback); return feedback; },

    async upsertDeviceToken(device) { deviceTokens.set(device.device_token, device); return device; },
    async listActiveWebDevices(userId) { return [...deviceTokens.values()].filter(item => item.user_id === userId && item.platform === 'WEB' && item.active); },
    async deactivateDeviceToken(token) { const device = deviceTokens.get(token); if (device) device.active = false; },

    async listNotificationsForUser(userId) { return notifications.filter(item => item.user_id === userId); },
    async createNotifications(list) { notifications.push(...list); },
    async listAllNotifications() { return notifications; },
    async cancelPendingNotifications(sessionId, exceptType) {
      notifications.filter(item => item.training_session_id === sessionId && item.type !== exceptType).forEach(item => { item.status = 'CANCELLED'; });
    },
    async updateNotificationStatus(id, status, sentAt) {
      const notification = notifications.find(item => item.id === id);
      if (notification) { notification.status = status; notification.sent_at = sentAt || notification.sent_at; }
    },

    async getNotificationState(userId) { return { ...stateFor(userId) }; },
    async setNotificationState(userId, state) { notificationState.set(userId, { ...state }); },

    async listConversations(userId) { return conversationsFor(userId); },
    async createConversation(conversation) { conversationsFor(conversation.user_id).push(conversation); conversationMessages.set(conversation.id, []); return conversation; },
    async getConversation(userId, id) { return conversationsFor(userId).find(item => item.id === id) || null; },
    async listMessages(conversationId) { return conversationMessages.get(conversationId) || []; },
    async addMessage(conversationId, message) { conversationMessages.get(conversationId).push(message); return message; },

    async recordEvent(event) { analyticsEvents.push(event); },
    async countEvents(eventName) { return analyticsEvents.filter(item => item.event_name === eventName).length; },

    async listRecentPosts(limit) { return socialPosts.slice(-limit).reverse(); },
    async createPost(post) { socialPosts.push(post); return post; },
    async getPost(id) { return socialPosts.find(item => item.id === id) || null; },
    async incrementPostLikes(id) { const post = socialPosts.find(item => item.id === id); if (post) post.likes += 1; return post || null; },
    async incrementPostComments(id) { const post = socialPosts.find(item => item.id === id); if (post) post.comments += 1; return post || null; },

    async createConnectionRequest(connection) { connections.push(connection); return connection; },
    async getConnection(id) { return connections.find(item => item.id === id) || null; },
    async findConnectionBetween(userIdA, userIdB) {
      return connections.find(item => (item.requester_id === userIdA && item.recipient_id === userIdB) || (item.requester_id === userIdB && item.recipient_id === userIdA)) || null;
    },
    async updateConnectionStatus(id, status) {
      const connection = connections.find(item => item.id === id);
      if (!connection) return null;
      connection.status = status;
      connection.updated_at = new Date().toISOString();
      return connection;
    },
    async listConnectionsForUser(userId) {
      return connections.filter(item => item.requester_id === userId || item.recipient_id === userId);
    },

    async listDirectMessages(connectionId) { return messagesFor(connectionId); },
    async createDirectMessage(message) { messagesFor(message.connection_id).push(message); return message; },

    async upsertLiveLocation(entry) { liveLocations.set(entry.user_id, entry); return entry; },
    async deleteLiveLocation(userId) { liveLocations.delete(userId); },
    async listActiveLiveLocations() {
      const now = Date.now();
      return [...liveLocations.values()].filter(item => new Date(item.expires_at).getTime() > now);
    },

    async createPickupEvent(event) { pickupEvents.set(event.id, event); pickupEventParticipants.set(event.id, new Set()); return event; },
    async getPickupEvent(id) { return pickupEvents.get(id) || null; },
    async listUpcomingPickupEvents() {
      const cutoff = Date.now() - 60 * 60 * 1000;
      return [...pickupEvents.values()].filter(event => new Date(event.scheduled_at).getTime() > cutoff).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    },
    async joinPickupEvent(eventId, userId) { if (!pickupEventParticipants.has(eventId)) pickupEventParticipants.set(eventId, new Set()); pickupEventParticipants.get(eventId).add(userId); },
    async leavePickupEvent(eventId, userId) { pickupEventParticipants.get(eventId)?.delete(userId); },
    async deletePickupEvent(eventId) { pickupEvents.delete(eventId); pickupEventParticipants.delete(eventId); },
    async listPickupEventParticipants(eventId) { return [...(pickupEventParticipants.get(eventId) || [])].map(userId => ({ event_id: eventId, user_id: userId })); },

    async load() {
      try {
        const saved = JSON.parse(await readFile(dataFile, 'utf8'));
        (saved.users || []).forEach(item => users.set(item.id, item));
        (saved.profiles || []).forEach(([id, value]) => profiles.set(id, value));
        (saved.sessions || []).forEach(([id, value]) => userSessions.set(id, value));
        (saved.userObjections || []).forEach(([id, value]) => userObjections.set(id, value));
        (saved.feedbacks || []).forEach(item => feedbacks.push(item));
        (saved.notifications || []).forEach(item => notifications.push(item));
        (saved.deviceTokens || []).forEach(([id, value]) => deviceTokens.set(id, value));
        (saved.conversations || []).forEach(([id, value]) => conversations.set(id, value));
        (saved.conversationMessages || []).forEach(([id, value]) => conversationMessages.set(id, value));
        (saved.analyticsEvents || []).forEach(item => analyticsEvents.push(item));
        (saved.socialPosts || []).forEach(item => socialPosts.push(item));
        (saved.notificationState || []).forEach(([id, value]) => notificationState.set(id, value));
        (saved.connections || []).forEach(item => connections.push(item));
        (saved.directMessages || []).forEach(([id, value]) => directMessages.set(id, value));
      } catch { /* First run starts with an empty store. */ }
    },
    persist() {
      const snapshot = {
        users: [...users.values()], profiles: [...profiles.entries()], sessions: [...userSessions.entries()],
        userObjections: [...userObjections.entries()], feedbacks, notifications, deviceTokens: [...deviceTokens.entries()],
        conversations: [...conversations.entries()], conversationMessages: [...conversationMessages.entries()],
        analyticsEvents, socialPosts, notificationState: [...notificationState.entries()],
        connections, directMessages: [...directMessages.entries()],
      };
      mkdir(dataDir, { recursive: true }).then(() => writeFile(dataFile, JSON.stringify(snapshot, null, 2), 'utf8')).catch(() => {});
    },
    async close() {},
  };
}
