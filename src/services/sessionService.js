import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { broadcastRealtime } from '../lib/realtime.js';

const LIVE_PRESENCE_STATES = new Set(['ENGAGED', 'PREPARING_TO_GO', 'LEFT']);
const PULSE_PHRASES = [
  name => `${name} também está treinando agora — bora junto?`,
  name => `${name} acabou de começar. Ninguém treina sozinho hoje.`,
  name => `${name} está na correria agora. Energia contagiante!`,
  name => `${name} apareceu. Essa é a parte que mais importa.`,
];

export const ALLOWED_STATES = new Set(['PENDING', 'PREPARING', 'ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NOT_COMPLETED']);

const STATE_TRANSITIONS = {
  PENDING: ['PREPARING', 'ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'CANCELLED', 'RESCHEDULED'],
  PREPARING: ['ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'CANCELLED', 'RESCHEDULED'],
  ENGAGED: ['OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'CANCELLED', 'RESCHEDULED'],
  OBJECTION: ['ENGAGED', 'PREPARING_TO_GO', 'LEFT', 'NOT_COMPLETED', 'RESCHEDULED'],
  PREPARING_TO_GO: ['LEFT', 'COMPLETED', 'CANCELLED'],
  LEFT: ['COMPLETED', 'NOT_COMPLETED'],
};

export function isFinalStatus(status) { return ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'].includes(status); }

export function canTransition(from, to) {
  return from === to || STATE_TRANSITIONS[from]?.includes(to) || (['COMPLETED', 'NOT_COMPLETED'].includes(to) && !isFinalStatus(from));
}

export function createSessionService({ store, analyticsService, notificationService }) {
  return {
    async list(userId) { return store.listSessions(userId); },

    async create(userId, input) {
      const status = input.status || 'PENDING';
      if (!ALLOWED_STATES.has(status)) throw badRequest('invalid_session_state');
      const profile = await store.getProfile(userId);
      const session = {
        id: randomUUID(),
        user_id: userId,
        activity: cleanText(input.activity || profile.activity || 'Atividade', 80),
        scheduled_at: cleanText(input.scheduled_at, 40),
        status,
        created_at: new Date().toISOString(),
      };
      await store.createSession(session);
      const durationMinutes = Number(profile.duration) || 45;
      const notifications = notificationService.buildSessionNotifications(session, durationMinutes);
      if (notifications.length) await store.createNotifications(notifications);
      await analyticsService.record(userId, 'TRAINING_CREATED', {}, session.id);
      return session;
    },

    async update(userId, id, input) {
      const session = await store.getSession(userId, id);
      if (!session) throw notFound('session_not_found');
      if (input.status && (!ALLOWED_STATES.has(input.status) || !canTransition(session.status, input.status))) throw badRequest('invalid_session_transition');

      const previousStatus = session.status;
      const previousRescued = Boolean(session.rescued);
      const patch = { status: input.status || session.status };
      if (input.rescue_opportunity !== undefined) patch.rescue_opportunity = Boolean(input.rescue_opportunity);
      if (input.rescued !== undefined) patch.rescued = Boolean(input.rescued);
      if (input.feeling !== undefined) patch.feeling = cleanText(input.feeling, 80);
      if (input.reason_not_completed !== undefined) patch.reason_not_completed = cleanText(input.reason_not_completed, 160);

      const updated = await store.updateSession(userId, id, patch);

      if (LIVE_PRESENCE_STATES.has(updated.status) && !LIVE_PRESENCE_STATES.has(previousStatus)) {
        const user = await store.getUserById(userId);
        if (user) {
          broadcastRealtime('presence-changed', { userId, name: user.name, activity: updated.activity, status: updated.status });
          const scheduledTime = new Date(updated.scheduled_at).getTime();
          const withinLiveWindow = !Number.isNaN(scheduledTime) && Math.abs(scheduledTime - Date.now()) <= 30 * 60000;
          if (withinLiveWindow) {
            const phrase = PULSE_PHRASES[Math.floor(Math.random() * PULSE_PHRASES.length)](user.name);
            broadcastRealtime('room-pulse', { userId, name: user.name, activity: updated.activity, message: phrase });
          }
        }
      }

      if (isFinalStatus(updated.status)) await notificationService.cancelPendingForSession(id);
      if (updated.status === 'COMPLETED') await analyticsService.record(userId, 'TRAINING_COMPLETED', {}, id);
      if (updated.status === 'RESCHEDULED') await analyticsService.record(userId, 'TRAINING_RESCHEDULED', {}, id);
      if (updated.status === 'NOT_COMPLETED') await analyticsService.record(userId, 'TRAINING_NOT_COMPLETED', {}, id);
      if (updated.status === 'PREPARING_TO_GO' && previousStatus !== 'PREPARING_TO_GO') await analyticsService.record(userId, 'TRAINING_CONFIRMED', {}, id);
      if (updated.rescued && !previousRescued) await analyticsService.record(userId, 'RESCUE_SUCCESS', {}, id);
      return updated;
    },

    async submitFeedback(userId, input) {
      const session = await store.getSession(userId, input.training_session_id);
      if (!session) throw notFound('session_not_found');
      const feedback = {
        id: randomUUID(),
        user_id: userId,
        training_session_id: session.id,
        completed: Boolean(input.completed),
        feeling: cleanText(input.feeling, 80),
        reason_not_completed: cleanText(input.reason_not_completed, 160),
        comment: cleanText(input.comment, 500),
        created_at: new Date().toISOString(),
      };
      await store.createFeedback(feedback);
      await analyticsService.record(userId, 'FEEDBACK_SUBMITTED', {}, session.id);
      return feedback;
    },
  };
}
