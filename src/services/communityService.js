import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';
import { isUserOnline, sendToUser, broadcastRealtime } from '../lib/realtime.js';

const LIVE_LOCATION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas: some sozinho se a pessoa esquecer de desligar.

async function requireAcceptedConnection(store, userId, connectionId) {
  const connection = await store.getConnection(connectionId);
  if (!connection || connection.status !== 'ACCEPTED' || (connection.requester_id !== userId && connection.recipient_id !== userId)) throw notFound('connection_not_found');
  return connection;
}

export function createCommunityService({ store }) {
  return {
    async listPeople(userId) {
      const [allUsers, myProfile, myConnections] = await Promise.all([store.listAllUsers(), store.getProfile(userId), store.listConnectionsForUser(userId)]);
      const others = allUsers.filter(user => user.id !== userId);
      const enriched = await Promise.all(others.map(async user => {
        const profile = await store.getProfile(user.id);
        const link = myConnections.find(item => item.requester_id === user.id || item.recipient_id === user.id);
        let connectionState = { state: 'none' };
        if (link && link.status === 'ACCEPTED') connectionState = { state: 'connected', connectionId: link.id };
        else if (link && link.status === 'PENDING') connectionState = { state: link.requester_id === userId ? 'pending_sent' : 'pending_received', connectionId: link.id };
        return {
          id: user.id,
          name: user.name,
          activity: profile.activity || null,
          time: profile.time || null,
          online: isUserOnline(user.id),
          connection: connectionState,
        };
      }));
      return enriched.sort((a, b) => {
        const aMatch = a.activity && a.activity === myProfile.activity ? 0 : 1;
        const bMatch = b.activity && b.activity === myProfile.activity ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return Number(b.online) - Number(a.online);
      });
    },

    async listConnections(userId) {
      const links = await store.listConnectionsForUser(userId);
      return Promise.all(links.map(async link => {
        const otherId = link.requester_id === userId ? link.recipient_id : link.requester_id;
        const other = await store.getUserById(otherId);
        return {
          id: link.id,
          status: link.status,
          direction: link.requester_id === userId ? 'outgoing' : 'incoming',
          user: other ? { id: other.id, name: other.name } : null,
          online: isUserOnline(otherId),
          created_at: link.created_at,
          updated_at: link.updated_at,
        };
      }));
    },

    async requestConnection(userId, targetUserId) {
      if (!targetUserId || targetUserId === userId) throw badRequest('invalid_connection_target');
      const targetUser = await store.getUserById(targetUserId);
      if (!targetUser) throw notFound('user_not_found');
      const existing = await store.findConnectionBetween(userId, targetUserId);
      if (existing && existing.status !== 'DECLINED') throw new AppError(409, 'connection_already_exists');
      const connection = { id: randomUUID(), requester_id: userId, recipient_id: targetUserId, status: 'PENDING', created_at: new Date().toISOString() };
      await store.createConnectionRequest(connection);
      const requester = await store.getUserById(userId);
      sendToUser(targetUserId, 'connection-request', { id: connection.id, from: { id: userId, name: requester.name } });
      return connection;
    },

    async respondToConnection(userId, connectionId, accept) {
      const connection = await store.getConnection(connectionId);
      if (!connection || connection.recipient_id !== userId) throw notFound('connection_not_found');
      if (connection.status !== 'PENDING') throw badRequest('connection_not_pending');
      const updated = await store.updateConnectionStatus(connectionId, accept ? 'ACCEPTED' : 'DECLINED');
      const recipient = await store.getUserById(userId);
      sendToUser(connection.requester_id, accept ? 'connection-accepted' : 'connection-declined', { id: connectionId, by: { id: userId, name: recipient.name } });
      return updated;
    },

    async listMessages(userId, connectionId) {
      const connection = await requireAcceptedConnection(store, userId, connectionId);
      return store.listDirectMessages(connection.id);
    },

    async sendMessage(userId, connectionId, input) {
      const connection = await requireAcceptedConnection(store, userId, connectionId);
      const text = cleanText(input.text, 1000);
      if (!text) throw badRequest('invalid_message');
      const message = { id: randomUUID(), connection_id: connection.id, sender_id: userId, text, created_at: new Date().toISOString() };
      await store.createDirectMessage(message);
      const recipientId = connection.requester_id === userId ? connection.recipient_id : connection.requester_id;
      const sender = await store.getUserById(userId);
      sendToUser(recipientId, 'dm-received', { ...message, sender: { id: sender.id, name: sender.name } });
      return message;
    },

    async startLiveLocation(userId, { lat, lng, activity } = {}) {
      // Arredondado a ~3 casas decimais (~100m) antes de sair do front-end: o backend
      // nunca recebe nem guarda a coordenada exata do GPS da pessoa.
      const roundedLat = Math.round(Number(lat) * 1000) / 1000;
      const roundedLng = Math.round(Number(lng) * 1000) / 1000;
      if (!Number.isFinite(roundedLat) || !Number.isFinite(roundedLng) || Math.abs(roundedLat) > 90 || Math.abs(roundedLng) > 180) throw badRequest('invalid_coordinates');
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + LIVE_LOCATION_DURATION_MS);
      const entry = { user_id: userId, lat: roundedLat, lng: roundedLng, activity: cleanText(activity, 60) || null, started_at: startedAt.toISOString(), expires_at: expiresAt.toISOString() };
      await store.upsertLiveLocation(entry);
      const user = await store.getUserById(userId);
      broadcastRealtime('live-location-updated', { userId, name: user.name, activity: entry.activity, lat: roundedLat, lng: roundedLng, expiresAt: entry.expires_at });
      return entry;
    },

    async stopLiveLocation(userId) {
      await store.deleteLiveLocation(userId);
      broadcastRealtime('live-location-removed', { userId });
    },

    async listLiveLocations() {
      return store.listActiveLiveLocations();
    },
  };
}
