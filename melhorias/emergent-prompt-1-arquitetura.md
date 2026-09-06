# Prompt 1/4 — Arquitetura e Banco de Dados — Companheiro

Você é um engenheiro de software sênior e arquiteto de sistemas. Vamos construir, em etapas, o aplicativo **Companheiro**: um companheiro digital de disciplina para atividade física, cuja missão é "não deixar a pessoa desistir antes de começar" — atuando no intervalo entre "eu deveria ir" e "eu vou ou não vou". Este é o **Prompt 1 de 4** (Arquitetura e Banco). Os próximos tratarão de Telas/UX, IA/Objeções e Testes/Métricas — mas construa desde já pensando na integração com eles.

Não gere apenas mockup. Quero frontend, backend, banco de dados, autenticação, notificações e integração de IA, todos funcionais.

## Regra fundamental do produto

O app NUNCA gera culpa. Proibido: "Você está decepcionando você mesma", "Você é preguiçosa", "Você está falhando", ou qualquer frase que envergonhe o usuário. Filosofia: "Eu não vou te julgar. Mas também não vou deixar você desistir por qualquer motivo." Se houver impossibilidade real (ex. trabalho até tarde), ajudar a achar alternativa (treinar mais tarde, menos tempo, em casa, ou remarcar) em vez de cobrar.

## Plataforma

Mobile-first, prioridade Android, arquitetura preparada para iOS depois (ou multiplataforma se o ambiente permitir).

## Identidade visual (para os componentes de base)

Premium, moderna, acolhedora — não parecer app médico nem academia tradicional. Minimalista, elegante, bastante espaço em branco, cards arredondados, tipografia limpa, ícones simples, animações discretas. Paleta: fundo claro/branco/cinza muito claro; verde para sucesso; amarelo para atenção; vermelho só quando necessário; uma cor forte de CTA. Preparar estrutura para Dark Mode futuro.

## Arquitetura

Modular, separando: authentication; users; profiles; activities; schedules; sessions; conversations; messages; objections; notifications; AI; analytics. Sem lógica duplicada. Criar services isolados:

- `NotificationService`
- `TrainingSessionService`
- `ConversationService`
- `ObjectionService`
- `AIService`
- `AnalyticsService`

### AIService

Camada isolada. Recebe: `user_profile`, `training_session`, `conversation_history`, `current_state`, `current_objection`. Retorna: `response_text`, `detected_objection`, `suggested_state`, `suggested_action`, `confidence`. Nenhuma lógica de IA deve ficar espalhada no frontend.

### Fallback da IA

Se a API de IA estiver indisponível, o app continua funcionando com respostas pré-configuradas por objeção (ex. cansaço: "Entendi. É cansaço físico ou falta de vontade de começar?"; preguiça: "Vamos pensar só nos próximos cinco minutos. Levanta e coloca o tênis. Depois você decide."; chuva: "Hoje talvez seja melhor adaptar. Quer pensar em uma alternativa?"). O app nunca pode quebrar por falta da IA.

## Banco de dados

Relacional (PostgreSQL/Supabase). Entidades e campos:

**USERS**: id, name, email, phone, password_hash/auth_provider, created_at, updated_at.

**USER_PROFILE**: id, user_id, primary_activity, discipline_level, work_status, study_status, has_children, primary_goal, personalized_motivation, created_at, updated_at.

**ACTIVITIES**: id, name, active, created_at.

**TRAINING_SCHEDULE**: id, user_id, activity_id, weekday, scheduled_time, duration_minutes, location, commute_minutes, transport_type, active, created_at, updated_at.

**OBJECTIONS**: id, name, category, active, created_at. (seed: Cansaço, Preguiça, Frio, Chuva, Trabalho, Filhos, Falta de tempo, Falta de vontade, Desânimo, Falta de companhia, Vergonha, Dor)

**USER_OBJECTIONS**: id, user_id, objection_id, frequency, last_occurred_at, created_at, updated_at.

**TRAINING_SESSIONS**: id, user_id, schedule_id, activity_id, scheduled_date, scheduled_time, status, started_at, completed_at, cancelled_at, rescheduled_to, created_at, updated_at. Status possíveis (máquina de estados, ver Prompt 3): PENDING, PREPARING, ENGAGED, OBJECTION, PREPARING_TO_GO, LEFT, COMPLETED, RESCHEDULED, CANCELLED, NOT_COMPLETED.

**CONVERSATIONS**: id, user_id, training_session_id, started_at, ended_at, status, created_at.

**MESSAGES**: id, conversation_id, sender_type (APP/USER), message, message_type (TEXT/QUICK_REPLY/SYSTEM), ai_generated, created_at.

**FEEDBACK**: id, training_session_id, completed, feeling, reason_not_completed, comment, created_at.

**NOTIFICATIONS**: id, user_id, training_session_id, type (T_MINUS_60/45/30/20, POST_TRAINING), scheduled_for, sent_at, status, created_at.

**USER_DEVICE_TOKENS**: id, user_id, device_token, platform, active, created_at, updated_at (preparar para push).

**ANALYTICS_EVENTS**: id, user_id, training_session_id, event_name, metadata, created_at. Eventos: ONBOARDING_STARTED, ONBOARDING_COMPLETED, TRAINING_CREATED, NOTIFICATION_SENT, NOTIFICATION_OPENED, CHAT_STARTED, OBJECTION_IDENTIFIED, TRAINING_CONFIRMED, TRAINING_RESCHEDULED, TRAINING_COMPLETED, TRAINING_NOT_COMPLETED, FEEDBACK_SUBMITTED, RESCUE_SUCCESS.

## Segurança e privacidade

Autenticação segura; proteção de rotas; cada usuário só acessa seus próprios dados; senhas com hash seguro; validação de entrada; nunca expor chaves de API no frontend. Se usar Supabase, habilitar Row Level Security em todas as tabelas. Permitir excluir conta e dados, atualizar perfil, controlar notificações. Não coletar dados desnecessários. Sem GPS/localização no MVP.

## Responsividade e acessibilidade

Mobile-first, mas componentes preparados para telas Android pequenas/grandes e tablets no futuro. Bom contraste, fontes legíveis, áreas de toque adequadas, labels, suporte básico a leitores de tela, nunca depender só de cor para indicar status.

## Fora do escopo deste MVP

Não implemente agora: smartwatch, Apple Health/Google Fit, GPS, ranking, comunidade, desafios, dieta, contador de calorias, integração com academias, plano de treino, acompanhamento médico, personal trainer, marketplace, pagamentos, gamificação avançada, voz avançada.

## Entregável deste prompt

1. Estrutura de pastas/módulos do projeto (frontend + backend).
2. Schema completo do banco com as entidades acima e relações.
3. Autenticação (registro/login) funcionando de ponta a ponta.
4. Esqueleto dos 6 services listados, com AIService já isolado e com fallback funcional (pode usar respostas pré-configuradas por enquanto, a IA completa vem no Prompt 3).
5. Configuração de RLS/autorização por usuário.

Priorize código organizado e reutilizável sobre volume de features. O próximo prompt vai construir as telas em cima desta base.
