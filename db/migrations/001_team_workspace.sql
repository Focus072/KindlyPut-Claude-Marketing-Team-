-- Kindly Put Studio AI team workspace.
-- Everything lives in its own "team" schema so it never touches the tables
-- used by the public website. Only additive statements: no existing table is
-- altered or dropped.

create schema if not exists team;

-- Studio team members who can sign in to the workspace.
create table if not exists team.members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- Sign-in sessions. Only a SHA-256 hash of the cookie token is stored.
create table if not exists team.sessions (
  token_hash text primary key,
  member_id uuid not null references team.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_member_idx on team.sessions(member_id);

-- One workspace per client. All other client data hangs off this id.
create table if not exists team.clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  created_by uuid references team.members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Brand guidelines and reference notes for a client. Only "approved"
-- entries are given to the specialists.
create table if not exists team.brand_guidelines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references team.clients(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  updated_by uuid references team.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_guidelines_client_idx on team.brand_guidelines(client_id);

create table if not exists team.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references team.clients(id) on delete cascade,
  name text not null,
  goal text not null default '',
  status text not null default 'active' check (status in ('active', 'in_review', 'done', 'archived')),
  created_by uuid references team.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_client_idx on team.campaigns(client_id);

-- A chat with one specialist, inside one client workspace.
-- specialist_id refers to the configs in src/specialists (not stored here),
-- so role instructions are never mixed into conversation history.
create table if not exists team.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references team.clients(id) on delete cascade,
  campaign_id uuid references team.campaigns(id) on delete set null,
  specialist_id text not null check (specialist_id in ('maya', 'jules', 'theo', 'nova', 'remy')),
  title text not null default 'New conversation',
  created_by uuid references team.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_client_specialist_idx
  on team.conversations(client_id, specialist_id, updated_at desc);

create table if not exists team.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references team.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  author_id uuid references team.members(id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  stop_reason text,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on team.messages(conversation_id, created_at);

-- Explicit handoffs between stages. Only "approved" handoffs are shared
-- with later specialists.
create table if not exists team.handoffs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references team.clients(id) on delete cascade,
  campaign_id uuid references team.campaigns(id) on delete set null,
  from_specialist text not null check (from_specialist in ('maya', 'jules', 'theo', 'nova', 'remy')),
  to_stage text not null check (to_stage in ('jules', 'theo', 'nova', 'remy', 'review')),
  title text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'changes_requested', 'archived')),
  source_message_id uuid references team.messages(id) on delete set null,
  created_by uuid references team.members(id) on delete set null,
  approved_by uuid references team.members(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists handoffs_client_idx on team.handoffs(client_id, created_at desc);

-- Lock the schema away from Supabase's public REST API. The workspace
-- server connects with its own database credentials instead.
alter table team.members enable row level security;
alter table team.sessions enable row level security;
alter table team.clients enable row level security;
alter table team.brand_guidelines enable row level security;
alter table team.campaigns enable row level security;
alter table team.conversations enable row level security;
alter table team.messages enable row level security;
alter table team.handoffs enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema team from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on schema team from authenticated;
  end if;
end $$;
