import { registerRealtimeStreamRoutes } from './realtimeStream.js';
import { registerAuthRoutes } from './auth.js';
import { registerProfileRoutes } from './profile.js';
import { registerSessionRoutes } from './sessions.js';
import { registerObjectionRoutes } from './objections.js';
import { registerConversationRoutes } from './conversations.js';
import { registerNotificationRoutes } from './notifications.js';
import { registerSocialRoutes } from './social.js';
import { registerAdminRoutes } from './admin.js';
import { registerVoiceRoutes } from './voice.js';
import { registerCommunityRoutes } from './community.js';

// Cada handler assume a mesma responsabilidade do antigo bloco de `if` em server.js:
// devolve `true` quando atendeu a rota, `false` para o roteador tentar o próximo.
// A ordem importa pouco aqui porque cada rota casa em (method, path) exatos ou um
// padrão bem específico — não há sobreposição entre os grupos.
export function createRouter(ctx) {
  const handlers = [
    registerRealtimeStreamRoutes(ctx),
    registerAuthRoutes(ctx),
    registerProfileRoutes(ctx),
    registerSessionRoutes(ctx),
    registerObjectionRoutes(ctx),
    registerConversationRoutes(ctx),
    registerNotificationRoutes(ctx),
    registerSocialRoutes(ctx),
    registerAdminRoutes(ctx),
    registerVoiceRoutes(ctx),
    registerCommunityRoutes(ctx),
  ];

  return async function route(request, response) {
    for (const handle of handlers) {
      if (await handle(request, response)) return true;
    }
    return false;
  };
}
