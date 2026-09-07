import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';

export function createConversationService({ store, analyticsService }) {
  return {
    async list(userId) { return store.listConversations(userId); },

    async create(userId, input) {
      const conversation = {
        id: randomUUID(),
        user_id: userId,
        training_session_id: input.training_session_id || null,
        started_at: new Date().toISOString(),
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };
      await store.createConversation(conversation);
      await analyticsService.record(userId, 'CHAT_STARTED', {}, conversation.training_session_id);
      return conversation;
    },

    async listMessages(userId, conversationId) {
      const conversation = await store.getConversation(userId, conversationId);
      if (!conversation) throw notFound('conversation_not_found');
      return store.listMessages(conversationId);
    },

    async addMessage(userId, conversationId, input) {
      const conversation = await store.getConversation(userId, conversationId);
      if (!conversation) throw notFound('conversation_not_found');
      const message = {
        id: randomUUID(),
        conversation_id: conversationId,
        sender_type: ['APP', 'USER', 'SYSTEM'].includes(input.sender_type) ? input.sender_type : 'USER',
        message: cleanText(input.message, 1000),
        message_type: ['TEXT', 'QUICK_REPLY', 'SYSTEM'].includes(input.message_type) ? input.message_type : 'TEXT',
        ai_generated: Boolean(input.ai_generated),
        created_at: new Date().toISOString(),
      };
      if (!message.message) throw badRequest('invalid_message');
      await store.addMessage(conversationId, message);
      return message;
    },
  };
}
