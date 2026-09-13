-- SCOPEGRADE AI — PUBLIC PROPOSAL LINKS
-- Run once in Supabase SQL Editor before installing the matching app update.

create extension if not exists pgcrypto;

alter table public.proposals
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists public_enabled boolean not null default false,
  add column if not exists shared_at timestamptz,
  add column if not exists viewed_at timestamptz;

update public.proposals
set public_token = gen_random_uuid()
where public_token is null;

alter table public.proposals
  alter column public_token set default gen_random_uuid(),
  alter column public_token set not null;

create unique index if not exists proposals_public_token_idx
  on public.proposals(public_token);

create or replace function public.get_public_proposal(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'proposal_number', p.proposal_number,
    'title', p.title,
    'status', p.status,
    'currency', p.currency,
    'subtotal', p.subtotal,
    'maintenance_monthly', p.maintenance_monthly,
    'deposit_percentage', p.deposit_percentage,
    'deposit_amount', p.deposit_amount,
    'scope_items', p.scope_items,
    'add_ons', p.add_ons,
    'client_message', p.client_message,
    'valid_until', p.valid_until,
    'created_at', p.created_at,
    'client_name', coalesce(c.name, 'Client'),
    'client_email', c.email,
    'package_name', a.package_name,
    'grade', a.grade,
    'owner_name', coalesce(nullif(pr.full_name, ''), nullif(pr.business_name, ''), 'ScopeGrade team'),
    'owner_email', pr.email,
    'business_name', coalesce(nullif(pr.business_name, ''), 'ScopeGrade AI')
  )
  from public.proposals p
  left join public.clients c on c.id = p.client_id
  left join public.assessments a on a.id = p.assessment_id
  left join public.profiles pr on pr.id = p.owner_id
  where p.public_enabled = true
    and p.public_token::text = p_token
  limit 1;
$$;

create or replace function public.track_public_proposal_view(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  update public.proposals
  set
    status = case when status = 'sent' then 'viewed' else status end,
    viewed_at = coalesce(viewed_at, now()),
    updated_at = now()
  where public_enabled = true
    and public_token::text = p_token;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.get_public_proposal(text) from public;
revoke all on function public.track_public_proposal_view(text) from public;

grant execute on function public.get_public_proposal(text) to anon, authenticated;
grant execute on function public.track_public_proposal_view(text) to anon, authenticated;

-- Table access remains protected by the existing owner-only RLS policies.
-- Anonymous visitors can read only the safe JSON returned for a valid active token.
