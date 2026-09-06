create extension if not exists "uuid-ossp";

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
create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  id uuid not null default uuid_generate_v4(),
  primary_activity_id uuid references activities(id) on delete set null,
  activities jsonb not null default '[]',
  discipline_level text,
  frequency integer,
  days jsonb not null default '[]',
  scheduled_time time,
  duration_minutes integer,
  personalized_motivation text,
  goal text,
  difficulty text,
  objections jsonb not null default '[]',
  work_status text,
  study_status text,
  has_children boolean,
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
