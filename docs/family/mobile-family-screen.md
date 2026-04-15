# Mobile Family Screen — groups, invites, and Python API

## Overview

The **Family** tab lets a user create a single household group, see members, send invitations (by email via **Resend** when the invitee has no account yet, or add them directly when they already exist in Supabase Auth), and edit the family name (owner only). Data is stored in Supabase (`0005_family.sql`) and all mutations go through **Python** handlers under [`apps/web/api/family.py`](../../apps/web/api/family.py), using the same Bearer JWT + service-role pattern as [`wines.py`](../../apps/web/api/wines.py).

## User flows

### No family yet (empty state)

- Copy explains creating a group; **Create New Family** opens [`apps/mobile/app/family/create.tsx`](../../apps/mobile/app/family/create.tsx) (`POST /api/family` with `{ name }`).
- After success, the stack pops and the tab refetches `GET /api/family`.

### Family exists, only the owner (empty “members” emphasis)

- When `isOwner` is true and there is exactly **one** member row (the admin owner), a callout encourages inviting others.
- **Invite member** uses the same primary CTA styling as **Register New Moment** on the Moments tab: background `#5C4033`, height `56`, white label (`moments.tsx` `ctaBtn` / `ctaBtnText`).

### Family with members

- Card shows name, member count, and pending invite count (owner).
- **Members** list shows email (from Auth admin lookup on the server) or a short `user_id` fallback; **You** labels the current session.
- **Pending invitations** (owner): email + localised expiry date.
- **Settings** (gear): only for **owner** → [`family/edit.tsx`](../../apps/mobile/app/family/edit.tsx) (`PATCH /api/family`).

### Invite by email

- [`family/invite-member.tsx`](../../apps/mobile/app/family/invite-member.tsx): user enters email → `POST /api/family/members`.
- If an Auth user exists with that email → insert `family_members` (`201`, `addedMember`).
- Else → insert `family_invitations` + send email via Resend (`201`, `invited`). If Resend fails after the row is stored, API returns `502` with an error message.

### Accept invitation (deep link / web link)

- Email link is built as `{PUBLIC_APP_URL}/family/invite?token=...` when `PUBLIC_APP_URL` (or `NEXT_PUBLIC_APP_URL`) is set; otherwise **`momentovino://family/invite?token=...`** (see [`app.json`](../../apps/mobile/app.json) `scheme`).
- Screen: [`apps/mobile/app/family/invite.tsx`](../../apps/mobile/app/family/invite.tsx) reads `token`, calls `POST /api/family/invitations/accept` with the **same** email as the signed-in Supabase user (case-insensitive match to the invitation). Success → alert → replace to `(tabs)/family`.

## Supabase schema (migration `0005_family.sql`)

| Table | Purpose |
|-------|---------|
| `families` | `name`, `owner_id` (**unique** — one owned family per user), timestamps |
| `family_members` | `family_id`, `user_id`, `role` (`admin` \| `member`), `joined_at` |
| `family_invitations` | Pending email invites: `token`, `expires_at`, `status`, etc. |
| `find_user_id_by_email(text)` | `SECURITY DEFINER` RPC, **execute granted to `service_role` only** — used by Python to resolve existing users without exposing `auth.users` to clients |

Row Level Security mirrors “owner + members can read; admins can manage invites” (see migration file for exact policies).

## HTTP API (Python, `apps/web/api/family.py`)

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/api/family` | Dashboard: `{ family, members, pendingInvitations, isOwner }`. Family resolved by **owned** row first, else first membership. |
| `POST` | `/api/family` | Create family + owner as `admin` member (`409` if already owner). |
| `PATCH` | `/api/family` | Rename family (owner only). |
| `POST` | `/api/family/members` | Body `{ "email" }` — add member or create invitation + Resend. |
| `POST` | `/api/family/invitations/accept` | Body `{ "token" }` — join family if JWT email matches invite. |

All routes require `Authorization: Bearer <user JWT>`.

## Environment variables (web / Flask)

See [`apps/web/.env.example`](../../apps/web/.env.example):

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `MomentoVino <onboarding@resend.dev>` |
| `PUBLIC_APP_URL` | Base URL for invite links in HTML emails |
| `RESEND_SKIP_SEND` | `true` to log the invite URL instead of calling Resend (local dev without a verified domain) |

`GEMINI_API_KEY` / Supabase keys remain as elsewhere.

## Mobile modules

| Path | Role |
|------|------|
| [`features/family/api.ts`](../../apps/mobile/features/family/api.ts) | Typed fetch helpers for all family endpoints |
| [`app/(tabs)/family.tsx`](../../apps/mobile/app/(tabs)/family.tsx) | Tab UI, refresh, empty states, CTA |
| [`app/family/_layout.tsx`](../../apps/mobile/app/family/_layout.tsx) | Stack for create / edit / invite flows |
| [`app/_layout.tsx`](../../apps/mobile/app/_layout.tsx) | Registers `family` stack next to `moments` / `scanner` |

`EXPO_PUBLIC_API_URL` must point at the host that proxies `/api/*` to Flask in dev (see [`lib/api-base.ts`](../../apps/mobile/lib/api-base.ts)).

## Operational notes

- **Resend**: the `from` domain must be verified in Resend; until then use `RESEND_SKIP_SEND=true` and copy the logged invite URL.
- **Universal links**: pointing `PUBLIC_APP_URL` at the Next dev server does not open the native app automatically; use the `momentovino://` fallback or configure universal links later.
- **Admin user lookup**: `GET /api/family` enriches each member with email via GoTrue Admin API (service role); acceptable for small groups.
