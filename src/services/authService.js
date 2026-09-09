import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { cleanText } from '../lib/http.js';
import { AppError, badRequest, unauthorized } from '../lib/errors.js';
import { touchActive } from '../lib/realtime.js';

export function createAuthService({ store, analyticsService }) {
  return {
    async register({ name, email, password }) {
      const cleanName = cleanText(name, 80);
      const cleanEmail = cleanText(email, 160).toLowerCase();
      const cleanPassword = String(password || '');
      if (cleanName.length < 2 || !cleanEmail.includes('@') || cleanPassword.length < 8 || cleanPassword.length > 200) throw badRequest('invalid_registration');
      if (await store.getUserByEmail(cleanEmail)) throw new AppError(409, 'email_already_registered');
      const id = randomUUID();
      const user = { id, name: cleanName, email: cleanEmail, password_hash: hashPassword(cleanPassword), created_at: new Date().toISOString() };
      await store.createUser(user);
      const token = randomUUID();
      await store.createAuthToken(token, id);
      await analyticsService.record(id, 'ONBOARDING_STARTED');
      return { user: { id, name: cleanName, email: cleanEmail }, token };
    },

    async login({ email, password }) {
      const cleanEmail = cleanText(email, 160).toLowerCase();
      const loginPassword = String(password || '');
      const user = await store.getUserByEmail(cleanEmail);
      if (!user || loginPassword.length > 200 || !verifyPassword(loginPassword, user.password_hash)) throw unauthorized('invalid_credentials');
      const token = randomUUID();
      await store.createAuthToken(token, user.id);
      return { user: { id: user.id, name: user.name, email: user.email }, token };
    },

    googleClientId() {
      return process.env.GOOGLE_CLIENT_ID || null;
    },

    async loginWithGoogle({ credential }) {
      const idToken = String(credential || '');
      const expectedAudience = process.env.GOOGLE_CLIENT_ID;
      if (!idToken || !expectedAudience) throw badRequest('google_login_not_configured');
      let payload;
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (!response.ok) throw new Error('invalid_token');
        payload = await response.json();
      } catch {
        throw unauthorized('invalid_google_token');
      }
      if (payload.aud !== expectedAudience) throw unauthorized('invalid_google_audience');
      if (payload.email_verified !== 'true' && payload.email_verified !== true) throw unauthorized('google_email_not_verified');
      const cleanEmail = cleanText(payload.email, 160).toLowerCase();
      let user = await store.getUserByEmail(cleanEmail);
      if (!user) {
        const id = randomUUID();
        user = { id, name: cleanText(payload.name, 80) || cleanEmail.split('@')[0], email: cleanEmail, password_hash: null, auth_provider: 'google', created_at: new Date().toISOString() };
        await store.createUser(user);
        await analyticsService.record(id, 'ONBOARDING_STARTED');
      }
      const token = randomUUID();
      await store.createAuthToken(token, user.id);
      return { user: { id: user.id, name: user.name, email: user.email }, token };
    },

    async authenticate(request) {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const userId = await store.getUserIdByToken(token);
      if (!userId) return null;
      touchActive(userId);
      return store.getUserById(userId);
    },

    async me(user) {
      const profile = await store.getProfile(user.id);
      const sessions = await store.listSessions(user.id);
      return { user: { id: user.id, name: user.name, email: user.email }, profile, sessions };
    },

    async deleteAccount(userId) {
      await store.deleteUser(userId);
    },
  };
}
