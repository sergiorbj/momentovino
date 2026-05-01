-- ============================================================
-- 0010_entitlements.sql — Server-mirrored RevenueCat entitlement
-- ============================================================
-- Mirrors a user's "pro" entitlement from RevenueCat onto the profiles row
-- so the app gates features by reading Supabase, not the local StoreKit cache.
-- The RC webhook (Supabase Edge Function `revenuecat-webhook`) is the only
-- writer; writes always go through service-role.
--
-- A user is "Pro" iff `pro_active = true` AND
--   (pro_expires_at IS NULL OR pro_expires_at > now()).
-- The view `public.user_entitlement` exposes a clean shape for clients.
-- ============================================================

alter table public.profiles
  add column if not exists pro_active                  boolean     not null default false,
  add column if not exists pro_expires_at              timestamptz,
  add column if not exists pro_will_renew              boolean     not null default false,
  add column if not exists pro_in_grace_period         boolean     not null default false,
  add column if not exists pro_in_billing_retry        boolean     not null default false,
  add column if not exists pro_period_type             text,        -- TRIAL | INTRO | NORMAL
  add column if not exists pro_store                   text,        -- APP_STORE | PLAY_STORE | STRIPE | PROMOTIONAL
  add column if not exists pro_product_id              text,
  add column if not exists pro_original_transaction_id text,
  add column if not exists pro_event_at                timestamptz, -- last RC event time
  add column if not exists pro_environment             text;        -- SANDBOX | PRODUCTION

create index if not exists profiles_pro_active_idx
  on public.profiles (pro_active)
  where pro_active;

create index if not exists profiles_pro_orig_tx_idx
  on public.profiles (pro_original_transaction_id);

-- ------------------------------------------------------------
-- View: clean entitlement shape, computes "currently active" honoring expiry
-- ------------------------------------------------------------
create or replace view public.user_entitlement
  with (security_invoker = on)
as
select
  p.id as user_id,
  (
    p.pro_active
    and (p.pro_expires_at is null or p.pro_expires_at > now())
  )                              as is_pro,
  p.pro_expires_at,
  p.pro_will_renew,
  p.pro_in_grace_period,
  p.pro_in_billing_retry,
  p.pro_period_type,
  p.pro_store,
  p.pro_product_id,
  p.pro_event_at
from public.profiles p;

comment on view public.user_entitlement is
  'Effective entitlement for the requesting user; honors expiry. RLS via security_invoker.';

-- ------------------------------------------------------------
-- RPC for the webhook to apply RC events transactionally.
-- Service-role only; takes the event payload pieces and upserts the
-- entitlement state. Idempotent by `event_id` -> writes only if event is
-- newer than the stored `pro_event_at` (so out-of-order webhooks don't
-- overwrite a more-recent state).
-- ------------------------------------------------------------
create or replace function public.apply_revenuecat_event(
  p_user_id        uuid,
  p_active         boolean,
  p_expires_at     timestamptz,
  p_will_renew     boolean,
  p_grace          boolean,
  p_billing_retry  boolean,
  p_period_type    text,
  p_store          text,
  p_product_id     text,
  p_original_tx_id text,
  p_environment    text,
  p_event_at       timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set pro_active                  = p_active,
         pro_expires_at              = p_expires_at,
         pro_will_renew              = coalesce(p_will_renew, false),
         pro_in_grace_period         = coalesce(p_grace, false),
         pro_in_billing_retry        = coalesce(p_billing_retry, false),
         pro_period_type             = p_period_type,
         pro_store                   = p_store,
         pro_product_id              = p_product_id,
         pro_original_transaction_id = p_original_tx_id,
         pro_environment             = p_environment,
         pro_event_at                = p_event_at
   where id = p_user_id
     -- Idempotency: only apply if this event is at-or-after the stored one.
     and (pro_event_at is null or p_event_at >= pro_event_at);
end;
$$;

revoke all on function public.apply_revenuecat_event(
  uuid, boolean, timestamptz, boolean, boolean, boolean,
  text, text, text, text, text, timestamptz
) from public;

grant execute on function public.apply_revenuecat_event(
  uuid, boolean, timestamptz, boolean, boolean, boolean,
  text, text, text, text, text, timestamptz
) to service_role;

-- ------------------------------------------------------------
-- TRANSFER handler: when a user's Apple ID buys on a different app account,
-- RC sends a TRANSFER event with `transferred_from` (loses entitlement) and
-- `transferred_to` (gains it). The webhook calls this to swap atomically.
-- ------------------------------------------------------------
create or replace function public.transfer_revenuecat_entitlement(
  p_from_user_id uuid,
  p_to_user_id   uuid,
  p_event_at     timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from_user_id is not null then
    update public.profiles
       set pro_active           = false,
           pro_in_grace_period  = false,
           pro_in_billing_retry = false,
           pro_event_at         = p_event_at
     where id = p_from_user_id
       and (pro_event_at is null or p_event_at >= pro_event_at);
  end if;

  if p_to_user_id is not null then
    update public.profiles
       set pro_active   = true,
           pro_event_at = p_event_at
     where id = p_to_user_id
       and (pro_event_at is null or p_event_at >= pro_event_at);
  end if;
end;
$$;

revoke all on function public.transfer_revenuecat_entitlement(uuid, uuid, timestamptz)
  from public;
grant execute on function public.transfer_revenuecat_entitlement(uuid, uuid, timestamptz)
  to service_role;

-- ------------------------------------------------------------
-- Hardening: prevent regular users from updating entitlement columns.
-- The "Users can update own profile" policy already exists; we add a
-- column-level rule via a trigger so RLS update by the owner cannot
-- touch entitlement fields.
-- ------------------------------------------------------------
create or replace function public.guard_profile_entitlement_columns()
returns trigger as $$
begin
  -- Skip for service_role (the webhook); only constrain end-users.
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if new.pro_active                  is distinct from old.pro_active                  or
     new.pro_expires_at              is distinct from old.pro_expires_at              or
     new.pro_will_renew              is distinct from old.pro_will_renew              or
     new.pro_in_grace_period         is distinct from old.pro_in_grace_period         or
     new.pro_in_billing_retry        is distinct from old.pro_in_billing_retry        or
     new.pro_period_type             is distinct from old.pro_period_type             or
     new.pro_store                   is distinct from old.pro_store                   or
     new.pro_product_id              is distinct from old.pro_product_id              or
     new.pro_original_transaction_id is distinct from old.pro_original_transaction_id or
     new.pro_event_at                is distinct from old.pro_event_at                or
     new.pro_environment             is distinct from old.pro_environment then
    raise exception 'Entitlement columns are read-only for end users';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_guard_entitlement on public.profiles;
create trigger profiles_guard_entitlement
  before update on public.profiles
  for each row execute function public.guard_profile_entitlement_columns();
