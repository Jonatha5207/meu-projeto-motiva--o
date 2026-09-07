import { cleanText } from '../lib/http.js';

function cleanList(value, max = 20, itemMax = 100) {
  return Array.isArray(value) ? value.map(item => cleanText(item, itemMax)).filter(Boolean).slice(0, max) : undefined;
}

export function createProfileService({ store, analyticsService }) {
  return {
    async update(userId, input) {
      const previous = await store.getProfile(userId);
      const profile = {
        ...previous,
        activity: cleanText(input.activity || previous.activity || 'Atividade', 80),
        activities: cleanList(input.activities) || previous.activities || [],
        frequency: Math.max(1, Math.min(7, Number(input.frequency) || 1)),
        days: cleanList(input.days, 7, 20) || previous.days || [],
        time: /^\d{2}:\d{2}$/.test(input.time) ? input.time : previous.time || '19:00',
        duration: Math.max(5, Math.min(240, Number(input.duration) || previous.duration || 45)),
        location: cleanText(input.location || previous.location, 160),
        commuteTime: cleanText(input.commuteTime || previous.commuteTime, 80),
        transport: cleanText(input.transport || previous.transport, 80),
        routines: Array.isArray(input.routines) ? input.routines.slice(0, 12) : previous.routines || [],
        goal: cleanText(input.goal || previous.goal, 160),
        motivation: cleanText(input.motivation || previous.motivation, 160),
        personalizedMotivation: cleanText(input.personalizedMotivation || previous.personalizedMotivation, 240),
        difficulty: cleanText(input.difficulty || previous.difficulty, 160),
        objections: cleanList(input.objections, 20, 80) || previous.objections || [],
        objection: cleanText(input.objection || previous.objection, 80),
        disciplineLevel: cleanText(input.disciplineLevel || previous.disciplineLevel, 120),
        workStatus: cleanText(input.workStatus || previous.workStatus, 120),
        studyStatus: cleanText(input.studyStatus || previous.studyStatus, 120),
        hasChildren: cleanText(input.hasChildren || previous.hasChildren, 40),
        notifications_enabled: input.notifications_enabled !== undefined ? Boolean(input.notifications_enabled) : (previous.notifications_enabled !== undefined ? previous.notifications_enabled : true),
        updated_at: new Date().toISOString(),
      };
      await store.setProfile(userId, profile);
      await analyticsService.record(userId, 'ONBOARDING_COMPLETED');
      return profile;
    },
  };
}
