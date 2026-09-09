import pg from 'pg';

const { Pool } = pg;

// IMPORTANTE: esta implementação não pôde ser testada contra um banco Postgres real
// nesta sessão (o ambiente de desenvolvimento não tinha Docker nem Postgres instalados).
// Foi revisada com cuidado linha a linha contra schema.sql e contra o comportamento já
// validado do memoryStore, mas recomenda-se rodar a bateria de smoke tests (ver
// melhorias/tecnico.md ou o histórico desta conversa) assim que houver um Supabase/
// Postgres real disponível, antes de usar em produção.

function sessionRowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    activity: row.activity,
    scheduled_at: row.scheduled_at instanceof Date ? row.scheduled_at.toISOString() : row.scheduled_at,
    status: row.status,
    rescue_opportunity: row.rescue_opportunity,
    rescued: row.rescued,
    feeling: row.feeling || undefined,
    reason_not_completed: row.reason_not_completed || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

function notificationRowToNotification(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    training_session_id: row.training_session_id,
    type: row.type,
    scheduled_for: row.scheduled_for instanceof Date ? row.scheduled_for.toISOString() : row.scheduled_for,
    sent_at: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at,
    status: row.status,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export function createPostgresStore({ connectionString, ssl = true, logger }) {
  const pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: false } : false });
  pool.on('error', error => logger?.error('postgres_pool_error', error));

  async function query(text, params) { return pool.query(text, params); }

  return {
    kind: 'postgres',

    async getUserById(id) {
      const { rows } = await query('select * from users where id = $1', [id]);
      return rows[0] || null;
    },
    async getUserByEmail(email) {
      const { rows } = await query('select * from users where email = $1', [email]);
      return rows[0] || null;
    },
    async createUser(user) {
      await query('insert into users (id, name, email, password_hash, auth_provider, created_at) values ($1, $2, $3, $4, $5, $6)', [user.id, user.name, user.email, user.password_hash || null, user.auth_provider || 'local', user.created_at]);
      await query('insert into user_profiles (user_id, data, notifications_enabled) values ($1, $2, true) on conflict (user_id) do nothing', [user.id, {}]);
      return user;
    },
    async deleteUser(userId) {
      // As foreign keys em schema.sql estão com "on delete cascade" para praticamente
      // tudo que pende de users/training_sessions/conversations, então isso já cobre
      // profile, sessões, objeções, conversas, mensagens, notificações e device tokens.
      await query('delete from users where id = $1', [userId]);
    },
    async countUsers() {
      const { rows } = await query('select count(*)::int as count from users', []);
      return rows[0].count;
    },
    async listAllUsers() {
      const { rows } = await query('select * from users', []);
      return rows;
    },

    async createAuthToken(token, userId) {
      // Tokens de sessão são efêmeros; guardamos em uma tabela simples separada do
      // schema principal para não obrigar todo deploy a rodar uma migração de auth.
      await query('create table if not exists auth_tokens (token text primary key, user_id uuid not null references users(id) on delete cascade, created_at timestamptz not null default now())', []);
      await query('insert into auth_tokens (token, user_id) values ($1, $2)', [token, userId]);
    },
    async getUserIdByToken(token) {
      const { rows } = await query('select user_id from auth_tokens where token = $1', [token]);
      return rows[0]?.user_id || null;
    },

    async getProfile(userId) {
      const { rows } = await query('select data, notifications_enabled from user_profiles where user_id = $1', [userId]);
      if (!rows[0]) return {};
      return { ...rows[0].data, notifications_enabled: rows[0].notifications_enabled };
    },
    async setProfile(userId, profile) {
      const { notifications_enabled = true, ...data } = profile;
      await query(
        `insert into user_profiles (user_id, data, notifications_enabled, updated_at) values ($1, $2, $3, now())
         on conflict (user_id) do update set data = excluded.data, notifications_enabled = excluded.notifications_enabled, updated_at = now()`,
        [userId, data, notifications_enabled],
      );
      return profile;
    },

    async listSessions(userId) {
      const { rows } = await query('select * from training_sessions where user_id = $1 order by created_at asc', [userId]);
      return rows.map(sessionRowToSession);
    },
    async listAllSessions() {
      const { rows } = await query('select * from training_sessions', []);
      return rows.map(sessionRowToSession);
    },
    async getSession(userId, id) {
      const { rows } = await query('select * from training_sessions where user_id = $1 and id = $2', [userId, id]);
      return sessionRowToSession(rows[0]);
    },
    async createSession(session) {
      await query(
        `insert into training_sessions (id, user_id, activity, scheduled_at, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $6)`,
        [session.id, session.user_id, session.activity, session.scheduled_at, session.status, session.created_at],
      );
      return session;
    },
    async updateSession(userId, id, patch) {
      const fields = [];
      const values = [];
      let index = 1;
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'updated_at') continue; // sempre atualizado via now() abaixo
        fields.push(`${key} = $${index}`);
        values.push(value);
        index += 1;
      }
      fields.push('updated_at = now()');
      values.push(userId, id);
      const { rows } = await query(
        `update training_sessions set ${fields.join(', ')} where user_id = $${index} and id = $${index + 1} returning *`,
        values,
      );
      return sessionRowToSession(rows[0]);
    },

    async listActiveObjections() {
      const { rows } = await query('select * from objections where active = true', []);
      return rows;
    },
    async findObjection(idOrName) {
      const { rows } = await query('select * from objections where id::text = $1 or lower(name) = lower($1)', [String(idOrName || '')]);
      return rows[0] || null;
    },
    async recordUserObjection(userId, objectionId) {
      const { rows } = await query(
        `insert into user_objection_links (user_id, objection_id, frequency, last_occurred_at)
         values ($1, $2, 1, now())
         on conflict (user_id, objection_id)
         do update set frequency = user_objection_links.frequency + 1, last_occurred_at = now(), updated_at = now()
         returning *`,
        [userId, objectionId],
      );
      return rows[0];
    },

    async createFeedback(feedback) {
      await query(
        `insert into feedback (id, training_session_id, completed, feeling, reason_not_completed, comment, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [feedback.id, feedback.training_session_id, feedback.completed, feedback.feeling || null, feedback.reason_not_completed || null, feedback.comment || null, feedback.created_at],
      );
      return feedback;
    },

    async upsertDeviceToken(device) {
      await query(
        `insert into user_device_tokens (id, user_id, device_token, platform, active, updated_at)
         values ($1, $2, $3, $4, true, $5)
         on conflict (device_token) do update set user_id = excluded.user_id, platform = excluded.platform, active = true, updated_at = excluded.updated_at`,
        [device.id, device.user_id, device.device_token, device.platform, device.updated_at],
      );
      return device;
    },
    async listActiveWebDevices(userId) {
      const { rows } = await query('select * from user_device_tokens where user_id = $1 and platform = $2 and active = true', [userId, 'WEB']);
      return rows;
    },
    async deactivateDeviceToken(token) {
      await query('update user_device_tokens set active = false, updated_at = now() where device_token = $1', [token]);
    },

    async listNotificationsForUser(userId) {
      const { rows } = await query('select * from notifications where user_id = $1', [userId]);
      return rows.map(notificationRowToNotification);
    },
    async createNotifications(list) {
      for (const item of list) {
        await query(
          `insert into notifications (id, user_id, training_session_id, type, scheduled_for, status, created_at)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [item.id, item.user_id, item.training_session_id, item.type, item.scheduled_for, item.status, item.created_at],
        );
      }
    },
    async listAllNotifications() {
      const { rows } = await query('select * from notifications', []);
      return rows.map(notificationRowToNotification);
    },
    async cancelPendingNotifications(sessionId, exceptType) {
      await query('update notifications set status = $1 where training_session_id = $2 and type != $3', ['CANCELLED', sessionId, exceptType]);
    },
    async updateNotificationStatus(id, status, sentAt) {
      await query('update notifications set status = $1, sent_at = $2 where id = $3', [status, sentAt || null, id]);
    },

    async getNotificationState(userId) {
      const { rows } = await query('select * from notification_state where user_id = $1', [userId]);
      if (!rows[0]) return {};
      return {
        lastDailyMotivationDate: rows[0].last_daily_motivation_date,
        lastStreakMilestone: rows[0].last_streak_milestone,
        lastReEngagementAt: rows[0].last_re_engagement_at,
      };
    },
    async setNotificationState(userId, state) {
      await query(
        `insert into notification_state (user_id, last_daily_motivation_date, last_streak_milestone, last_re_engagement_at)
         values ($1, $2, $3, $4)
         on conflict (user_id) do update set last_daily_motivation_date = excluded.last_daily_motivation_date,
           last_streak_milestone = excluded.last_streak_milestone, last_re_engagement_at = excluded.last_re_engagement_at`,
        [userId, state.lastDailyMotivationDate || null, state.lastStreakMilestone || 0, state.lastReEngagementAt || null],
      );
    },

    async listConversations(userId) {
      const { rows } = await query('select * from conversations where user_id = $1 order by started_at asc', [userId]);
      return rows;
    },
    async createConversation(conversation) {
      await query(
        `insert into conversations (id, user_id, training_session_id, started_at, status, created_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [conversation.id, conversation.user_id, conversation.training_session_id, conversation.started_at, conversation.status, conversation.created_at],
      );
      return conversation;
    },
    async getConversation(userId, id) {
      const { rows } = await query('select * from conversations where user_id = $1 and id = $2', [userId, id]);
      return rows[0] || null;
    },
    async listMessages(conversationId) {
      const { rows } = await query('select * from messages where conversation_id = $1 order by created_at asc', [conversationId]);
      return rows;
    },
    async addMessage(conversationId, message) {
      await query(
        `insert into messages (id, conversation_id, sender_type, message, message_type, ai_generated, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [message.id, conversationId, message.sender_type, message.message, message.message_type, message.ai_generated, message.created_at],
      );
      return message;
    },

    async recordEvent(event) {
      await query(
        `insert into analytics_events (id, user_id, training_session_id, event_name, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [event.id, event.user_id, event.training_session_id, event.event_name, event.metadata || {}, event.created_at],
      );
    },
    async countEvents(eventName) {
      const { rows } = await query('select count(*)::int as count from analytics_events where event_name = $1', [eventName]);
      return rows[0].count;
    },
    async listRecentEventsForUser(userId, limit = 50) {
      const { rows } = await query('select * from analytics_events where user_id = $1 order by created_at desc limit $2', [userId, limit]);
      return rows;
    },

    async listRecentPosts(limit = 50) {
      // O feed social não faz parte do schema.sql original (é uma extensão do MVP,
      // ver melhorias/social.md). Fica registrado aqui para não perder o recurso ao
      // trocar para Postgres, mas precisa de revisão de produto antes de ir para
      // produção (moderação, denúncia etc., como o roadmap já lista).
      await query('create table if not exists social_posts (id uuid primary key, user_id uuid not null references users(id) on delete cascade, author text not null, activity text not null, text text not null, likes integer not null default 0, comments integer not null default 0, created_at timestamptz not null default now())', []);
      const { rows } = await query('select * from social_posts order by created_at desc limit $1', [limit]);
      return rows;
    },
    async createPost(post) {
      await query('create table if not exists social_posts (id uuid primary key, user_id uuid not null references users(id) on delete cascade, author text not null, activity text not null, text text not null, likes integer not null default 0, comments integer not null default 0, created_at timestamptz not null default now())', []);
      await query('insert into social_posts (id, user_id, author, activity, text, likes, comments, created_at) values ($1, $2, $3, $4, $5, 0, 0, $6)', [post.id, post.user_id, post.author, post.activity, post.text, post.created_at]);
      return post;
    },
    async getPost(id) {
      const { rows } = await query('select * from social_posts where id = $1', [id]);
      return rows[0] || null;
    },
    async incrementPostLikes(id) {
      const { rows } = await query('update social_posts set likes = likes + 1 where id = $1 returning *', [id]);
      return rows[0] || null;
    },
    async incrementPostComments(id) {
      const { rows } = await query('update social_posts set comments = comments + 1 where id = $1 returning *', [id]);
      return rows[0] || null;
    },

    async createConnectionRequest(connection) {
      await query(
        'insert into connections (id, requester_id, recipient_id, status, created_at, updated_at) values ($1, $2, $3, $4, $5, $5)',
        [connection.id, connection.requester_id, connection.recipient_id, connection.status, connection.created_at],
      );
      return connection;
    },
    async getConnection(id) {
      const { rows } = await query('select * from connections where id = $1', [id]);
      return rows[0] || null;
    },
    async findConnectionBetween(userIdA, userIdB) {
      const { rows } = await query(
        'select * from connections where (requester_id = $1 and recipient_id = $2) or (requester_id = $2 and recipient_id = $1)',
        [userIdA, userIdB],
      );
      return rows[0] || null;
    },
    async updateConnectionStatus(id, status) {
      const { rows } = await query('update connections set status = $1, updated_at = now() where id = $2 returning *', [status, id]);
      return rows[0] || null;
    },
    async listConnectionsForUser(userId) {
      const { rows } = await query('select * from connections where requester_id = $1 or recipient_id = $1', [userId]);
      return rows;
    },

    async listDirectMessages(connectionId) {
      const { rows } = await query('select * from direct_messages where connection_id = $1 order by created_at asc', [connectionId]);
      return rows;
    },
    async createDirectMessage(message) {
      await query(
        'insert into direct_messages (id, connection_id, sender_id, text, created_at) values ($1, $2, $3, $4, $5)',
        [message.id, message.connection_id, message.sender_id, message.text, message.created_at],
      );
      return message;
    },

    async upsertLiveLocation(entry) {
      await query(
        `insert into live_locations (user_id, lat, lng, activity, started_at, expires_at)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id) do update set lat = excluded.lat, lng = excluded.lng, activity = excluded.activity, started_at = excluded.started_at, expires_at = excluded.expires_at`,
        [entry.user_id, entry.lat, entry.lng, entry.activity || null, entry.started_at, entry.expires_at],
      );
      return entry;
    },
    async deleteLiveLocation(userId) {
      await query('delete from live_locations where user_id = $1', [userId]);
    },
    async listActiveLiveLocations() {
      const { rows } = await query('select * from live_locations where expires_at > now()', []);
      return rows;
    },

    async createPickupEvent(event) {
      await query(
        `insert into pickup_events (id, creator_id, activity, title, location_name, lat, lng, scheduled_at, duration_minutes, price_cents, max_spots, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [event.id, event.creator_id, event.activity, event.title, event.location_name, event.lat, event.lng, event.scheduled_at, event.duration_minutes, event.price_cents, event.max_spots, event.created_at],
      );
      return event;
    },
    async getPickupEvent(id) {
      const { rows } = await query('select * from pickup_events where id = $1', [id]);
      return rows[0] || null;
    },
    async listUpcomingPickupEvents() {
      const { rows } = await query("select * from pickup_events where scheduled_at > now() - interval '1 hour' order by scheduled_at asc", []);
      return rows;
    },
    async joinPickupEvent(eventId, userId) {
      await query('insert into pickup_event_participants (event_id, user_id) values ($1, $2) on conflict (event_id, user_id) do nothing', [eventId, userId]);
    },
    async leavePickupEvent(eventId, userId) {
      await query('delete from pickup_event_participants where event_id = $1 and user_id = $2', [eventId, userId]);
    },
    async deletePickupEvent(eventId) {
      await query('delete from pickup_events where id = $1', [eventId]);
    },
    async listPickupEventParticipants(eventId) {
      const { rows } = await query('select * from pickup_event_participants where event_id = $1', [eventId]);
      return rows;
    },

    async load() { /* Postgres não precisa de carga manual: os dados já vivem no banco. */ },
    persist() { /* Cada método já grava direto no banco; não há snapshot a salvar. */ },
    async ping() { await query('select 1', []); return true; },
    async close() { await pool.end(); },
  };
}
