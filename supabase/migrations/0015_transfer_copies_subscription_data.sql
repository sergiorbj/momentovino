-- ============================================================
-- 0015_transfer_copies_subscription_data.sql — Fix TRANSFER bug
-- ============================================================
-- The previous `transfer_revenuecat_entitlement` only flipped `pro_active`
-- (false on source, true on destination). It did NOT copy the rich
-- subscription fields (`pro_expires_at`, `pro_will_renew`, `pro_period_type`,
-- `pro_store`, `pro_product_id`, `pro_original_transaction_id`,
-- `pro_environment`), so a destination user gained `pro_active=true` but lost
-- the expiration date and product info — the orphan kept the data even though
-- it no longer owned the entitlement.
--
-- Real-world symptom: anon paid during onboarding → Apple sign-in transfer →
-- destination shows `is_pro=true` (since `pro_expires_at IS NULL` is treated
-- as "never expires" by the view), but the boot gate can still flip
-- `is_pro=false` if a stale expires_at lingered. Either way the data is wrong.
--
-- Fix: snapshot the source's subscription fields, copy them to the destination,
-- null them on the source. The semantic of TRANSFER is "the entitlement moves";
-- everything that describes it should move with it.
-- ============================================================

create or replace function public.transfer_revenuecat_entitlement(
  p_from_user_id uuid,
  p_to_user_id   uuid,
  p_event_at     timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires_at     timestamptz;
  v_will_renew     boolean;
  v_grace          boolean;
  v_billing_retry  boolean;
  v_period_type    text;
  v_store          text;
  v_product_id     text;
  v_original_tx_id text;
  v_environment    text;
begin
  if p_from_user_id is not null then
    select pro_expires_at, pro_will_renew, pro_in_grace_period, pro_in_billing_retry,
           pro_period_type, pro_store, pro_product_id, pro_original_transaction_id,
           pro_environment
      into v_expires_at, v_will_renew, v_grace, v_billing_retry,
           v_period_type, v_store, v_product_id, v_original_tx_id,
           v_environment
      from public.profiles
     where id = p_from_user_id;

    update public.profiles
       set pro_active                  = false,
           pro_expires_at              = null,
           pro_will_renew              = false,
           pro_in_grace_period         = false,
           pro_in_billing_retry        = false,
           pro_period_type             = null,
           pro_store                   = null,
           pro_product_id              = null,
           pro_original_transaction_id = null,
           pro_environment             = null,
           pro_event_at                = p_event_at
     where id = p_from_user_id
       and (pro_event_at is null or p_event_at >= pro_event_at);
  end if;

  if p_to_user_id is not null then
    update public.profiles
       set pro_active                  = true,
           pro_expires_at              = v_expires_at,
           pro_will_renew              = coalesce(v_will_renew, false),
           pro_in_grace_period         = coalesce(v_grace, false),
           pro_in_billing_retry        = coalesce(v_billing_retry, false),
           pro_period_type             = v_period_type,
           pro_store                   = v_store,
           pro_product_id              = v_product_id,
           pro_original_transaction_id = v_original_tx_id,
           pro_environment             = v_environment,
           pro_event_at                = p_event_at
     where id = p_to_user_id
       and (pro_event_at is null or p_event_at >= pro_event_at);
  end if;
end;
$$;

revoke all on function public.transfer_revenuecat_entitlement(uuid, uuid, timestamptz)
  from public;
grant execute on function public.transfer_revenuecat_entitlement(uuid, uuid, timestamptz)
  to service_role;
