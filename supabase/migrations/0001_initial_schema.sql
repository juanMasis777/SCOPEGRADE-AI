-- SCOPEGRADE AI — 0001 INITIAL SCHEMA
-- Creates the profiles, clients, assessments and proposals tables together with
-- the owner-only row level security policies the workspace relies on.
-- Safe to run more than once and safe to run on an existing installation.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated workspace owner
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row automatically when a new account signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles as p (id, email, full_name, business_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(p.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_created_idx
  on public.clients(owner_id, created_at desc);

-- One contact per email inside a workspace, so repeat assessments reuse the client.
create unique index if not exists clients_owner_email_idx
  on public.clients(owner_id, email)
  where email is not null;

alter table public.clients enable row level security;

drop policy if exists "clients_owner_all" on public.clients;
create policy "clients_owner_all" on public.clients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_name text not null default 'Untitled project',
  project_type text not null default 'landing'
    check (project_type in ('landing', 'business', 'ecommerce', 'webapp')),
  pages integer not null default 1 check (pages >= 0),
  sections integer not null default 4 check (sections >= 0),
  content_ready boolean not null default true,
  bilingual boolean not null default false,
  booking boolean not null default false,
  payments boolean not null default false,
  client_login boolean not null default false,
  custom_design boolean not null default false,
  rush boolean not null default false,
  maintenance boolean not null default true,
  notes text,
  package_name text not null
    check (package_name in ('Promotional', 'Professional', 'Custom')),
  grade text not null check (grade in ('A', 'B', 'C')),
  recommended_price numeric(12, 2) not null default 0,
  price_range text,
  complexity_score numeric(8, 2) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  included_items jsonb not null default '[]'::jsonb,
  extras jsonb not null default '[]'::jsonb,
  status text not null default 'completed'
    check (status in ('draft', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_owner_created_idx
  on public.assessments(owner_id, created_at desc);
create index if not exists assessments_client_idx
  on public.assessments(client_id);

alter table public.assessments enable row level security;

drop policy if exists "assessments_owner_all" on public.assessments;
create policy "assessments_owner_all" on public.assessments
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  proposal_number text not null,
  title text not null default 'Project proposal',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  currency text not null default 'USD',
  subtotal numeric(12, 2) not null default 0,
  maintenance_monthly numeric(12, 2) not null default 0,
  deposit_percentage numeric(5, 2) not null default 50
    check (deposit_percentage >= 0 and deposit_percentage <= 100),
  deposit_amount numeric(12, 2) not null default 0,
  scope_items jsonb not null default '[]'::jsonb,
  add_ons jsonb not null default '[]'::jsonb,
  client_message text,
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists proposals_owner_number_idx
  on public.proposals(owner_id, proposal_number);
create index if not exists proposals_owner_created_idx
  on public.proposals(owner_id, created_at desc);
create index if not exists proposals_client_idx
  on public.proposals(client_id);

alter table public.proposals enable row level security;

drop policy if exists "proposals_owner_all" on public.proposals;
create policy "proposals_owner_all" on public.proposals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();
