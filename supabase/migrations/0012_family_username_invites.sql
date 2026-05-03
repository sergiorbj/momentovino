-- ============================================================
-- 0012_family_username_invites.sql
-- Reshape the family invitation flow:
--   * Email "invites" become marketing-only (App Store nudge sent
--     by the API, NOT persisted) — the email column stays nullable
--     for legacy rows but new rows use invited_user_id instead.
--   * Username invites are persisted with invited_user_id set so the
--     recipient can see them on their own family screen and
--     accept/decline.
--   * Add 'declined' to the status enum.
--   * Open RLS so the invitee can read and update their own invites.
--
-- One-family-per-user is intentionally enforced ONLY at the API layer
-- for the MVP — leaving room to allow multiple families per user later
-- without a destructive schema change.
-- ============================================================

-- Make email nullable, add invited_user_id, expand status check.
alter table public.family_invitations
  alter column email drop not null;

alter table public.family_invitations
  add column invited_user_id uuid references auth.users(id) on delete cascade;

create index family_invitations_invited_user_id_idx
  on public.family_invitations(invited_user_id);

-- New invites must carry exactly one of (email, invited_user_id).
alter table public.family_invitations
  add constraint family_invitations_target_xor_chk
  check (
    (email is not null and invited_user_id is null)
    or (email is null and invited_user_id is not null)
  );

-- Allow the new 'declined' status.
alter table public.family_invitations
  drop constraint if exists family_invitations_status_check;

alter table public.family_invitations
  add constraint family_invitations_status_check
  check (status in ('pending', 'accepted', 'expired', 'declined', 'cancelled'));

-- Block duplicate pending username-invites for the same (family, user).
-- Expired/declined/accepted rows don't count, so the validation "resets"
-- once the previous invite is no longer pending.
create unique index family_invitations_unique_pending_user
  on public.family_invitations(family_id, invited_user_id)
  where status = 'pending' and invited_user_id is not null;

-- 3) RLS — let the invitee see and update (accept/decline) their own
--    pending invitations. Existing admin policies stay as-is.
create policy "family_invitations_select_invitee" on public.family_invitations
  for select using (
    invited_user_id is not null and invited_user_id = auth.uid()
  );

create policy "family_invitations_update_invitee" on public.family_invitations
  for update using (
    invited_user_id is not null and invited_user_id = auth.uid()
  ) with check (
    invited_user_id is not null and invited_user_id = auth.uid()
  );
