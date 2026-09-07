import { randomUUID } from 'node:crypto';
import { cleanText } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';

function toView(post) { return { ...post }; }

export function createSocialService({ store, onFeedUpdated }) {
  return {
    async listFeed() {
      const posts = await store.listRecentPosts(50);
      return posts.map(toView);
    },

    async createPost(user, input) {
      const text = cleanText(input.text, 280);
      if (!text) throw badRequest('invalid_post');
      const profile = await store.getProfile(user.id);
      const activity = cleanText(input.activity || profile.activity || 'Atividade', 80);
      const post = { id: randomUUID(), user_id: user.id, author: user.name, activity, text, likes: 0, comments: 0, created_at: new Date().toISOString() };
      await store.createPost(post);
      onFeedUpdated?.(post);
      return toView(post);
    },

    async likePost(postId) {
      const post = await store.getPost(postId);
      if (!post) throw notFound('post_not_found');
      const updated = await store.incrementPostLikes(postId);
      onFeedUpdated?.(updated);
      return toView(updated);
    },

    async commentOnPost(user, postId, input) {
      const post = await store.getPost(postId);
      if (!post) throw notFound('post_not_found');
      const text = cleanText(input.text, 280);
      if (!text) throw badRequest('invalid_comment');
      const updated = await store.incrementPostComments(postId);
      onFeedUpdated?.(updated);
      return { id: randomUUID(), post_id: postId, author: user.name, text, created_at: new Date().toISOString() };
    },
  };
}
