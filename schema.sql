create extension if not exists "uuid-ossp";

-- Nota sobre Row Level Security: este backend (server.js/src/store/postgresStore.js)
-- se conecta ao Postgres diretamente via DATABASE_URL (um papel com privilégios
-- normais de aplicação), e é o único cliente que fala com o banco — toda autorização
-- (usuário só vê seus próprios dados) já é aplicada em src/services/*.js antes de
-- qualquer query. Políticas de RLS amarradas a auth.uid() só fariam sentido se o
-- frontend passasse a falar direto com a API REST/anon-key do Supabase (hoje ele só
-- fala com este backend). Se esse dia chegar, adicione RLS aqui *e* migre a
-- autenticação para o Supabase Auth ao mesmo tempo — uma política de RLS sem esse
-- contexto seria decorativa e passaria uma falsa sensação de segurança.

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  phone text,
  password_hash text,
  auth_provider text not null default 'local',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- O onboarding evoluiu para campos livres (multiplas atividades/rotinas por usuario,
-- local, deslocamento etc.) que crescem com frequencia. Em vez de perseguir isso com
-- colunas rigidas e migracoes constantes, guardamos o perfil como jsonb e mantemos
-- como coluna real só o que o agendador de notificacoes precisa filtrar de verdade.
create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  data jsonb not null default '{}',
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists notification_state (
  user_id uuid primary key references users(id) on delete cascade,
  last_daily_motivation_date date,
  last_streak_milestone integer not null default 0,
  last_re_engagement_at timestamptz
);
create table if not exists training_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  weekday smallint not null check (weekday between 0 and 6),
  scheduled_time time not null,
  duration_minutes integer,
  location text,
  commute_minutes integer,
  transport_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists objections (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists user_objection_links (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  objection_id uuid not null references objections(id) on delete cascade,
  frequency integer not null default 1,
  last_occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, objection_id)
);
create table if not exists training_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  activity text not null,
  activity_id uuid references activities(id) on delete set null,
  schedule_id uuid references training_schedules(id) on delete set null,
  scheduled_date date,
  scheduled_time time,
  scheduled_at timestamptz not null,
  status text not null default 'PENDING',
  rescue_opportunity boolean not null default false,
  rescued boolean not null default false,
  feeling text,
  reason_not_completed text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  rescheduled_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('PENDING','PREPARING','ENGAGED','OBJECTION','PREPARING_TO_GO','LEFT','COMPLETED','RESCHEDULED','CANCELLED','NOT_COMPLETED'))
);
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  training_session_id uuid references training_sessions(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('APP','USER','SYSTEM')),
  message text not null,
  message_type text not null default 'TEXT' check (message_type in ('TEXT','QUICK_REPLY','SYSTEM')),
  ai_generated boolean not null default false,
  detected_objection text,
  intent text,
  confidence numeric,
  created_at timestamptz not null default now()
);
create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  training_session_id uuid references training_sessions(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  training_session_id uuid not null references training_sessions(id) on delete cascade,
  completed boolean not null,
  feeling text,
  reason_not_completed text,
  comment text,
  created_at timestamptz not null default now()
);
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  training_session_id uuid references training_sessions(id) on delete cascade,
  type text not null check (type in ('T_MINUS_60','T_MINUS_45','T_MINUS_30','T_MINUS_20','POST_TRAINING')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'SCHEDULED',
  created_at timestamptz not null default now()
);
create table if not exists user_objections (
  user_id uuid not null references users(id) on delete cascade,
  objection text not null,
  frequency integer not null default 1,
  last_occurred_at timestamptz not null default now(),
  primary key (user_id, objection)
);
create table if not exists user_device_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  device_token text not null unique,
  platform text not null check (platform in ('ANDROID', 'IOS', 'WEB')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id != recipient_id)
);
create unique index if not exists idx_connections_pair on connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create table if not exists direct_messages (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references connections(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_direct_messages_connection on direct_messages(connection_id, created_at);
-- Localizacao ao vivo: opt-in, uma linha por usuario (upsert), sempre com expiracao.
-- lat/lng chegam arredondados (~3 casas decimais, ~100m) desde o front-end -- o
-- backend nunca recebe nem guarda a coordenada exata do GPS.
create table if not exists live_locations (
  user_id uuid primary key references users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  activity text,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_live_locations_expires on live_locations(expires_at);
-- Jogos marcados: qualquer pessoa cria um horario/local pra sua modalidade, outras
-- entram como participantes. lat/lng aqui tambem chegam arredondados do front-end.
create table if not exists pickup_events (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references users(id) on delete cascade,
  activity text not null,
  title text not null,
  location_name text not null,
  lat double precision,
  lng double precision,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  price_cents integer not null default 0,
  max_spots integer not null default 10,
  created_at timestamptz not null default now()
);
create index if not exists idx_pickup_events_scheduled on pickup_events(scheduled_at);
create table if not exists pickup_event_participants (
  event_id uuid not null references pickup_events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
-- Chat do jogo/encontro: so quem confirmou presenca (participante ou criador)
-- ve e manda mensagem aqui -- e o grupo de combinar os detalhes do encontro.
create table if not exists pickup_event_messages (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references pickup_events(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pickup_event_messages_event on pickup_event_messages(event_id, created_at);
create index if not exists idx_sessions_user_date on training_sessions(user_id, scheduled_at);
create index if not exists idx_schedules_user_weekday on training_schedules(user_id, weekday, scheduled_time);
create index if not exists idx_events_name on analytics_events(event_name, created_at);

insert into activities (name) values
  ('Academia'), ('Corrida'), ('Caminhada'), ('Natação'), ('Ciclismo'), ('Crossfit'), ('Dança'),
  ('Futebol'), ('Futsal'), ('Basquete'), ('Vôlei'), ('Tênis'), ('Beach Tennis'), ('Badminton'), ('Squash'),
  ('Yoga'), ('Pilates'), ('Alongamento'), ('Boxe'), ('Jiu-Jitsu'), ('Muay Thai'), ('Karatê'), ('Taekwondo'), ('MMA'),
  ('Skate'), ('Surf'), ('Remo'), ('Canoagem'), ('Stand up paddle'), ('Escalada'), ('Atletismo'), ('Ginástica'),
  ('Handebol'), ('Rugby'), ('Críquete'), ('Beisebol'), ('Softbol'), ('Hóquei'), ('Polo aquático'), ('Patinação'), ('Triatlo'), ('Outra')
on conflict (name) do nothing;
insert into objections (name, category) values
  ('Cansaço', 'energia'), ('Preguiça', 'resistência'), ('Falta de tempo', 'rotina'),
  ('Trabalho', 'rotina'), ('Filhos', 'contexto'), ('Frio', 'ambiente'),
  ('Chuva', 'ambiente'), ('Falta de vontade', 'resistência'), ('Desânimo', 'emocional'),
  ('Não vejo resultado', 'motivação'), ('Falta de companhia', 'social'),
  ('Vergonha', 'social'), ('Dor', 'segurança'), ('Outro', 'outro')
on conflict (name) do nothing;

create or replace view rescue_metrics as
select count(*) filter (where rescue_opportunity) as opportunities,
       count(*) filter (where rescued) as rescues,
       coalesce(round(100.0 * count(*) filter (where rescued) / nullif(count(*) filter (where rescue_opportunity), 0), 2), 0) as rescue_rate
from training_sessions;
