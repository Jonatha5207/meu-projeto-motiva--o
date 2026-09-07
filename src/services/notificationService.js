import { randomUUID } from 'node:crypto';
import webpush from 'web-push';

const motivationalPhrases = ['Você não precisa sentir vontade. Só precisa dar o próximo passo.', 'Cinco minutos já contam. Começar também é uma vitória.', 'Hoje não é sobre provar nada. É sobre cuidar de você.', 'Um treino de cada vez. Seu futuro agradece a presença de hoje.', 'Você não está sozinho. Eu fico com você até o próximo passo.', 'Não precisa ser perfeito. Precisa ser possível para hoje.', 'Seu ritmo também merece respeito. Vamos começar do jeito que der.', 'A parte mais difícil é começar. Eu fico aqui enquanto você começa.', 'Você já escolheu cuidar de si. Agora vamos transformar isso em um pequeno gesto.', 'Mesmo devagar, você ainda está indo.', 'O treino de hoje é um encontro com a pessoa que você quer ser.', 'Se o dia pesou, vamos diminuir o passo, não abandonar você.', 'Você não precisa carregar tudo sozinho. Vamos resolver só os próximos minutos.', 'A sua presença vale mais do que a sua performance.', 'Quando parecer difícil, me chama. A gente encontra uma versão possível.'];

const NOTIFICATION_OFFSET_MINUTES = { T_MINUS_60: -60, T_MINUS_45: -45, T_MINUS_30: -30, T_MINUS_20: -20 };
const PREP_TYPES = ['T_MINUS_60', 'T_MINUS_45', 'T_MINUS_30', 'T_MINUS_20'];
const FINAL_STATES = ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'];
const STREAK_THRESHOLDS = [5, 10, 25, 50, 100];
const RE_ENGAGEMENT_MS = 3 * 24 * 60 * 60 * 1000;

function scheduledFor(session, type, durationMinutes = 45) {
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

export function createNotificationService({ store, analyticsService, logger }) {
  const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (vapidConfigured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@companheiro.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  async function sendWebPushToUser(userId, payload) {
    if (!vapidConfigured) return;
    const devices = await store.listActiveWebDevices(userId);
    await Promise.all(devices.map(async device => {
      try {
        await webpush.sendNotification(JSON.parse(device.device_token), JSON.stringify(payload));
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) await store.deactivateDeviceToken(device.device_token);
        else logger.warn('web_push_send_failed', { userId, statusCode: error.statusCode });
      }
    }));
  }

  return {
    vapidPublicKey: () => (vapidConfigured ? process.env.VAPID_PUBLIC_KEY : null),

    buildSessionNotifications(session, durationMinutes) {
      return ['T_MINUS_60', 'T_MINUS_45', 'T_MINUS_30', 'T_MINUS_20', 'POST_TRAINING']
        .map(type => {
          const at = scheduledFor(session, type, durationMinutes);
          if (!at) return null;
          return { id: randomUUID(), user_id: session.user_id, training_session_id: session.id, type, scheduled_for: at, status: 'SCHEDULED', created_at: new Date().toISOString() };
        })
        .filter(Boolean);
    },

    async listForUser(userId) { return store.listNotificationsForUser(userId); },
    async cancelPendingForSession(sessionId) { await store.cancelPendingNotifications(sessionId, 'POST_TRAINING'); },

    async processScheduledNotifications() {
      const now = Date.now();
      const pending = (await store.listAllNotifications()).filter(item => item.status === 'SCHEDULED' && new Date(item.scheduled_for).getTime() <= now);
      for (const notification of pending) {
        const session = await store.getSession(notification.user_id, notification.training_session_id);
        const profile = await store.getProfile(notification.user_id);
        const shouldSkip = !session || FINAL_STATES.includes(session.status) || (PREP_TYPES.includes(notification.type) && ['PREPARING_TO_GO', 'LEFT'].includes(session.status)) || profile.notifications_enabled === false;
        if (shouldSkip) { await store.updateNotificationStatus(notification.id, 'CANCELLED'); continue; }
        const copy = notificationCopy(notification.type, { activity: session.activity });
        await sendWebPushToUser(notification.user_id, { title: copy.title, body: copy.body, key: notification.type, tag: `companheiro-${notification.type.toLowerCase()}` });
        await store.updateNotificationStatus(notification.id, 'SENT', new Date().toISOString());
        await analyticsService.record(notification.user_id, 'NOTIFICATION_SENT', { type: notification.type }, notification.training_session_id);
      }
    },

    async processDailyMotivation() {
      if (new Date().getHours() < 8) return;
      const todayKey = new Date().toISOString().slice(0, 10);
      for (const user of await store.listAllUsers()) {
        const profile = await store.getProfile(user.id);
        if (profile.notifications_enabled === false) continue;
        const state = await store.getNotificationState(user.id);
        if (state.lastDailyMotivationDate === todayKey) continue;
        await store.setNotificationState(user.id, { ...state, lastDailyMotivationDate: todayKey });
        const copy = notificationCopy('DAILY_MOTIVATION');
        await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'DAILY_MOTIVATION', tag: 'companheiro-daily' });
        await analyticsService.record(user.id, 'DAILY_MOTIVATION_SENT');
      }
    },

    async processStreakMilestones() {
      for (const user of await store.listAllUsers()) {
        const sessions = await store.listSessions(user.id);
        const completed = sessions.filter(item => item.status === 'COMPLETED').length;
        const state = await store.getNotificationState(user.id);
        const nextThreshold = STREAK_THRESHOLDS.find(value => value <= completed && (state.lastStreakMilestone || 0) < value);
        if (!nextThreshold) continue;
        await store.setNotificationState(user.id, { ...state, lastStreakMilestone: nextThreshold });
        const copy = notificationCopy('STREAK_MILESTONE', { count: nextThreshold });
        await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'STREAK_MILESTONE', tag: 'companheiro-streak' });
        await analyticsService.record(user.id, 'STREAK_MILESTONE_SENT', { count: nextThreshold });
      }
    },

    async processReEngagement() {
      const now = Date.now();
      for (const user of await store.listAllUsers()) {
        const profile = await store.getProfile(user.id);
        if (profile.notifications_enabled === false) continue;
        const sessions = await store.listSessions(user.id);
        if (!sessions.length) continue;
        const lastActivity = Math.max(...sessions.map(item => new Date(item.updated_at || item.created_at).getTime()));
        if (now - lastActivity < RE_ENGAGEMENT_MS) continue;
        const state = await store.getNotificationState(user.id);
        if (state.lastReEngagementAt && now - new Date(state.lastReEngagementAt).getTime() < RE_ENGAGEMENT_MS) continue;
        await store.setNotificationState(user.id, { ...state, lastReEngagementAt: new Date().toISOString() });
        const copy = notificationCopy('RE_ENGAGEMENT');
        await sendWebPushToUser(user.id, { title: copy.title, body: copy.body, key: 'RE_ENGAGEMENT', tag: 'companheiro-reengage' });
        await analyticsService.record(user.id, 'RE_ENGAGEMENT_SENT');
      }
    },

    async runScheduler() {
      try {
        await this.processScheduledNotifications();
        await this.processDailyMotivation();
        await this.processStreakMilestones();
        await this.processReEngagement();
        store.persist();
      } catch (error) {
        logger.error('notification_scheduler_failed', error);
      }
    },
  };
}
