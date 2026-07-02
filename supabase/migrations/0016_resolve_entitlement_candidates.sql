-- ============================================================
-- 0016_resolve_entitlement_candidates.sql — Alias-aware webhook routing
-- ============================================================
-- A purchase made during onboarding is anchored on the anonymous user_id.
-- After Apple/Google sign-in, `Purchases.logIn` aliases the anon id and the
-- authenticated id under the same RevenueCat subscriber — no TRANSFER fires.
-- Later server-side events (trial → paid RENEWAL, billing, expiration) then
-- arrive with `app_user_id` = the anon id, and the webhook mirrored them onto
-- the orphaned anon profile while the real account stayed on the stale trial.
--
-- Fix: RC webhook payloads carry `aliases` (every app_user_id of the
-- subscriber). This RPC lets the webhook look up which of those ids exist in
-- auth.users and whether they are anonymous, so it can route the event to the
-- authenticated account.
-- ============================================================

create or replace function public.resolve_entitlement_candidates(
  p_candidates uuid[]
) returns table (
  user_id         uuid,
  is_anonymous    boolean,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.is_anonymous, u.last_sign_in_at
    from auth.users u
   where u.id = any(p_candidates);
$$;

revoke all on function public.resolve_entitlement_candidates(uuid[]) from public;
grant execute on function public.resolve_entitlement_candidates(uuid[]) to service_role;
