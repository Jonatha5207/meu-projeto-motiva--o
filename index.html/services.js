(function exposeCompanionServices() {
  const stateTransitions = {
    PENDING: ['PREPARING', 'CANCELLED', 'RESCHEDULED'],
    PREPARING: ['ENGAGED', 'OBJECTION', 'PREPARING_TO_GO', 'CANCELLED', 'RESCHEDULED'],
    ENGAGED: ['OBJECTION', 'PREPARING_TO_GO', 'LEFT', 'CANCELLED', 'RESCHEDULED'],
    OBJECTION: ['ENGAGED', 'PREPARING_TO_GO', 'LEFT', 'NOT_COMPLETED', 'RESCHEDULED'],
    PREPARING_TO_GO: ['LEFT', 'COMPLETED', 'CANCELLED'],
    LEFT: ['COMPLETED', 'NOT_COMPLETED'],
    COMPLETED: [], CANCELLED: [], RESCHEDULED: [], NOT_COMPLETED: []
  };

  const TrainingSessionService = {
    canTransition(from, to) { return from === to || stateTransitions[from]?.includes(to); },
    transition(session, nextState) { if (!this.canTransition(session.status, nextState)) throw new Error('invalid_session_transition'); return { ...session, status: nextState, updated_at: new Date().toISOString() }; },
    isFinal(session) { return ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_COMPLETED'].includes(session.status); }
  };

  const ObjectionService = {
    detect(text) { const value = String(text || '').toLowerCase(); const rules = [{ key: 'dor', words: ['dor', 'lesao', 'mal-estar'] }, { key: 'cansaco', words: ['cansado', 'exausto'] }, { key: 'tempo', words: ['sem tempo', 'atrasado'] }, { key: 'companhia', words: ['sozinho', 'companhia'] }, { key: 'chuva', words: ['chuva', 'chovendo'] }]; return rules.find(rule => rule.words.some(word => value.includes(word)))?.key || null; }
  };

  const AIService = {
    buildContext({ user_profile, training_session, conversation_history, current_state, current_objection }) { return { user_profile, training_session, conversation_history: conversation_history?.slice(-12) || [], current_state, current_objection }; },
    result(response_text, detected_objection = null, suggested_state = null, suggested_action = null, confidence = 0) { return { response_text, detected_objection, suggested_state, suggested_action, confidence }; }
  };

  const NotificationService = {
    shouldSend(session, type) { if (TrainingSessionService.isFinal(session)) return false; if (session.status === 'LEFT' || session.confirmed) return type === 'POST_TRAINING'; return ['T_MINUS_60', 'T_MINUS_45', 'T_MINUS_30', 'T_MINUS_20', 'POST_TRAINING'].includes(type); }
  };

  const AnalyticsService = { rescueRate(rescues, opportunities) { return opportunities ? Math.round((rescues / opportunities) * 100) : 0; } };
  window.CompanionServices = { TrainingSessionService, ObjectionService, AIService, NotificationService, AnalyticsService };
})();
