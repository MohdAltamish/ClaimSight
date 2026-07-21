-- ClaimSight temporary and saved claim workspaces. Run this in the Supabase SQL editor.
create table if not exists public.jobs (
  id uuid primary key,
  access_secret_hash text not null,
  status text not null,
  expires_at timestamptz,
  case_reference text unique,
  saved_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Safely upgrade projects that created the original temporary-workspace table.
alter table public.jobs add column if not exists case_reference text;
alter table public.jobs add column if not exists saved_at timestamptz;
alter table public.jobs alter column expires_at drop not null;
create unique index if not exists jobs_case_reference_unique on public.jobs (case_reference) where case_reference is not null;
create index if not exists jobs_active_or_saved_idx on public.jobs (expires_at) where expires_at is not null;

create table if not exists public.inventory_items (
  job_id uuid references public.jobs(id) on delete cascade,
  item_id text not null,
  payload jsonb not null,
  primary key (job_id, item_id)
);

create table if not exists public.policy_findings (
  job_id uuid references public.jobs(id) on delete cascade,
  finding_id text not null,
  payload jsonb not null,
  primary key (job_id, finding_id)
);

create table if not exists public.exports (
  job_id uuid references public.jobs(id) on delete cascade,
  format text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  primary key (job_id, format)
);

-- Server-only encrypted application settings. The Gemini API key is encrypted
-- before insertion; the browser never receives the plaintext value.
create table if not exists public.app_settings (
  setting_key text primary key check (setting_key = 'gemini_api_key'),
  encrypted_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.policy_findings enable row level security;
alter table public.exports enable row level security;
alter table public.app_settings enable row level security;

-- The browser never accesses these tables. ClaimSight server routes use the
-- service-role key and verify each job's opaque access secret before access.
-- Saved cases additionally require their Case ID and recovery code, whose
-- hash remains in access_secret_hash; no plaintext recovery code is stored.
-- app_settings is accessed only by server routes after administrator validation.
