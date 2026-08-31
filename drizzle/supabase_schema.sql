-- ============================================================================
-- LAYR SUPABASE POSTGRES COMPLETE DATABASE SCHEMA & RLS POLICIES
-- Target: Supabase Postgres SQL Editor
-- Execute this single script in Supabase SQL Editor to set up all tables!
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. USERS TABLE
create table if not exists public.users (
  id serial primary key,
  open_id varchar(64) not null unique,
  name text,
  email varchar(320),
  login_method varchar(64),
  role varchar(16) default 'user' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_signed_in timestamptz default now() not null
);

-- 2. PROJECTS TABLE
create table if not exists public.projects (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  name varchar(160) not null,
  description text,
  current_stage varchar(32) default 'evidence' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. EVIDENCE ITEMS TABLE
create table if not exists public.evidence_items (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  title varchar(220) not null,
  source varchar(220) not null,
  source_type varchar(48) not null,
  raw_text text not null,
  tags jsonb default '[]'::jsonb not null,
  status varchar(32) default 'unreviewed' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. EVIDENCE ATTACHMENTS TABLE
create table if not exists public.evidence_attachments (
  id serial primary key,
  evidence_id integer not null references public.evidence_items(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  file_name varchar(255) not null,
  mime_type varchar(120) not null,
  file_key varchar(500) not null,
  file_url varchar(1000) not null,
  file_size integer not null,
  created_at timestamptz default now() not null
);

-- 5. GENERATED OUTPUTS TABLE
create table if not exists public.generated_outputs (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  output_type varchar(48) not null,
  title varchar(220) not null,
  evidence_ids jsonb default '[]'::jsonb not null,
  content jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

-- 6. FEATURE CANDIDATES TABLE
create table if not exists public.feature_candidates (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  title varchar(220) not null,
  rationale text not null,
  evidence_ids jsonb default '[]'::jsonb not null,
  selected integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. REQUIREMENTS TABLE
create table if not exists public.requirements (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  feature_id integer references public.feature_candidates(id) on delete set null,
  requirement_type varchar(48) not null,
  statement text not null,
  user_story text not null,
  acceptance_criteria jsonb default '[]'::jsonb not null,
  evidence_ids jsonb default '[]'::jsonb not null,
  status varchar(32) default 'draft' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 8. IA NODES TABLE
create table if not exists public.ia_nodes (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  parent_id integer references public.ia_nodes(id) on delete set null,
  label varchar(220) not null,
  node_type varchar(48) not null,
  position jsonb default '{"x": 0, "y": 0}'::jsonb not null,
  linked_evidence_ids jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 9. IA EDGES TABLE
create table if not exists public.ia_edges (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  from_node_id integer not null references public.ia_nodes(id) on delete cascade,
  to_node_id integer not null references public.ia_nodes(id) on delete cascade,
  edge_type varchar(48) not null,
  created_at timestamptz default now() not null
);

-- 10. FLOWS TABLE
create table if not exists public.flows (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  name varchar(220) not null,
  description text not null,
  linked_evidence_ids jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 11. FLOW NODES TABLE
create table if not exists public.flow_nodes (
  id serial primary key,
  flow_id integer not null references public.flows(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  node_type varchar(48) not null,
  label varchar(220) not null,
  trigger text not null,
  data_involved text not null,
  position jsonb default '{"x": 0, "y": 0}'::jsonb not null,
  linked_evidence_ids jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 12. FLOW EDGES TABLE
create table if not exists public.flow_edges (
  id serial primary key,
  flow_id integer not null references public.flows(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  from_node_id integer not null references public.flow_nodes(id) on delete cascade,
  to_node_id integer not null references public.flow_nodes(id) on delete cascade,
  condition_label varchar(220) not null,
  created_at timestamptz default now() not null
);

-- 13. STORYBOARD PANELS TABLE
create table if not exists public.storyboard_panels (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  flow_id integer not null references public.flows(id) on delete cascade,
  linked_flow_node_id integer references public.flow_nodes(id) on delete set null,
  order_index integer not null,
  caption text not null,
  linked_evidence_ids jsonb default '[]'::jsonb not null,
  thumbnail_url varchar(2048),
  thumbnail_state varchar(32) default 'idle' not null,
  created_at timestamptz default now() not null
);

-- 14. GAP FLAGS TABLE
create table if not exists public.gap_flags (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  flag_type varchar(64) not null,
  title varchar(220) not null,
  description text not null,
  why_it_matters text not null,
  severity varchar(32) not null,
  linked_entity_type varchar(64) not null,
  linked_entity_id integer,
  resolved integer default 0 not null,
  created_at timestamptz default now() not null
);

-- 15. SHARED REPORTS TABLE
create table if not exists public.shared_reports (
  id serial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  token varchar(96) not null unique,
  report_scope varchar(32) not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now() not null
);

-- 16. LOCAL CREDENTIALS TABLE (Custom Auth)
create table if not exists public.local_credentials (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade unique,
  email varchar(320) not null unique,
  password_hash varchar(512) not null,
  session_version integer default 1 not null,
  email_verified_at timestamptz,
  failed_sign_in_count integer default 0 not null,
  last_failed_sign_in_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 17. PASSWORD RESET TOKENS TABLE
create table if not exists public.password_reset_tokens (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  token_hash varchar(128) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

-- 18. EMAIL VERIFICATION TOKENS TABLE
create table if not exists public.email_verification_tokens (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  token_hash varchar(128) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

-- 19. AUTH RATE LIMITS TABLE
create table if not exists public.auth_rate_limits (
  id serial primary key,
  bucket varchar(64) not null,
  key_hash varchar(128) not null,
  window_started_at timestamptz not null,
  attempt_count integer default 0 not null,
  updated_at timestamptz default now() not null,
  unique(bucket, key_hash)
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_evidence_project_id on public.evidence_items(project_id);
create index if not exists idx_features_project_id on public.feature_candidates(project_id);
create index if not exists idx_requirements_project_id on public.requirements(project_id);
create index if not exists idx_ia_nodes_project_id on public.ia_nodes(project_id);
create index if not exists idx_flows_project_id on public.flows(project_id);
create index if not exists idx_storyboard_project_id on public.storyboard_panels(project_id);
create index if not exists idx_gap_flags_project_id on public.gap_flags(project_id);
create index if not exists idx_local_credentials_user_id on public.local_credentials(user_id);
