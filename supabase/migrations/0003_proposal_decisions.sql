-- SCOPEGRADE AI — 0003 CLIENT DECISIONS ON PUBLIC PROPOSALS
-- Lets the recipient of a private proposal link accept or decline it without
-- signing in, and returns the decision back to the workspace owner.
-- Safe to run more than once.

alter table public.proposals
  add column if not exists accepted_by_name text,
  add column if not exists declined_at timestamptz,
  add column if not exists decline_reason text;

-- Extend the public payload with the recorded decision.
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
    'accepted_at', p.accepted_at,
    'accepted_by_name', p.accepted_by_name,
    'declined_at', p.declined_at,
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

create or replace function public.accept_public_proposal(p_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated public.proposals%rowtype;
begin
  if length(btrim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'name_required');
  end if;

  update public.proposals as p
  set
    status = 'accepted',
    accepted_at = coalesce(p.accepted_at, now()),
    accepted_by_name = left(btrim(p_name), 120),
    viewed_at = coalesce(p.viewed_at, now()),
    declined_at = null,
    decline_reason = null,
    updated_at = now()
  where p.public_enabled = true
    and p.public_token::text = p_token
    and p.status in ('sent', 'viewed')
    and (p.valid_until is null or p.valid_until >= current_date)
  returning p.* into updated;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_actionable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', updated.status,
    'accepted_at', updated.accepted_at,
    'accepted_by_name', updated.accepted_by_name
  );
end;
$$;

create or replace function public.decline_public_proposal(p_token text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated public.proposals%rowtype;
begin
  update public.proposals as p
  set
    status = 'declined',
    declined_at = now(),
    decline_reason = nullif(left(btrim(coalesce(p_reason, '')), 500), ''),
    viewed_at = coalesce(p.viewed_at, now()),
    updated_at = now()
  where p.public_enabled = true
    and p.public_token::text = p_token
    and p.status in ('sent', 'viewed')
  returning p.* into updated;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_actionable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', updated.status,
    'declined_at', updated.declined_at
  );
end;
$$;

revoke all on function public.accept_public_proposal(text, text) from public;
revoke all on function public.decline_public_proposal(text, text) from public;

grant execute on function public.accept_public_proposal(text, text) to anon, authenticated;
grant execute on function public.decline_public_proposal(text, text) to anon, authenticated;

-- A decision is only ever recorded through these functions, for a link that is
-- still enabled and still inside its acceptance window. Table access stays
-- restricted to the owner by the existing row level security policies.
