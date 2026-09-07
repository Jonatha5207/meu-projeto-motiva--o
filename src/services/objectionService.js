import { cleanText } from '../lib/http.js';
import { notFound } from '../lib/errors.js';

export function createObjectionService({ store, analyticsService }) {
  return {
    async listActive() { return store.listActiveObjections(); },

    async recordForUser(userId, input) {
      const objection = await store.findObjection(input.objection_id || cleanText(input.name));
      if (!objection) throw notFound('objection_not_found');
      const link = await store.recordUserObjection(userId, objection.id);
      await analyticsService.record(userId, 'OBJECTION_IDENTIFIED', { objection: objection.name });
      return link;
    },
  };
}
