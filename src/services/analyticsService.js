import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { badRequest } from '../lib/errors.js';

export function createAnalyticsService({ store }) {
  return {
    async record(userId, eventName, metadata = {}, trainingSessionId = null) {
      await store.recordEvent({ id: randomUUID(), user_id: userId, training_session_id: trainingSessionId, event_name: eventName, metadata, created_at: new Date().toISOString() });
    },
    async recordFromClient(userId, input) {
      const eventName = cleanText(input.event_name, 80);
      if (!eventName) throw badRequest('invalid_event');
      await this.record(userId, eventName, input.metadata || {}, input.training_session_id || null);
    },
    async recentEventsForUser(userId, limit = 50) {
      return store.listRecentEventsForUser(userId, limit);
    },
    async adminMetrics() {
      const allSessions = await store.listAllSessions();
      const opportunities = allSessions.filter(item => item.rescue_opportunity).length;
      const rescues = allSessions.filter(item => item.rescued).length;
      const totalUsers = await store.countUsers();
      return {
        users: { total: totalUsers, active: totalUsers },
        sessions: {
          planned: allSessions.filter(item => item.status === 'PENDING').length,
          completed: allSessions.filter(item => item.status === 'COMPLETED').length,
          not_completed: allSessions.filter(item => item.status === 'NOT_COMPLETED').length,
          rescheduled: allSessions.filter(item => item.status === 'RESCHEDULED').length,
        },
        conversations: {
          events: await store.countEvents('CHAT_STARTED'),
          objections: await store.countEvents('OBJECTION_IDENTIFIED'),
        },
        rescue_rate: opportunities ? Math.round((rescues / opportunities) * 100) : 0,
      };
    },
  };
}
