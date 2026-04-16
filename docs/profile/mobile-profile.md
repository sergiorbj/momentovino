# Mobile Profile Screen — settings, edit profile, and Python API

## Overview

The **Profile** tab shows the user's identity (avatar, name, bio) and real stats (moments, wines, family) pulled from the database. Below the profile card, a settings list gives access to **Edit Profile**, **Notifications**, **Language**, and **Talk to Us**. Data lives in a new `profiles` table in Supabase, and all mutations go through **Python** handlers under [`apps/web/api/profile.py`](../../apps/web/api/profile.py), using the same Bearer JWT + service-role pattern as [`family.py`](../../apps/web/api/family.py).

**Removed from the original stub:** Appearance and Privacy (not needed at this stage).

---

## Settings items (final list)

| # | Icon | Label | Action |
|---|------|-------|--------|
| 1 | `create-outline` | **Edit Profile** | Push to `profile/edit.tsx` — edit avatar photo, display name, bio |
| 2 | `notifications-outline` | **Notifications** | Inline toggle (Switch) — no sub-screen |
| 3 | `globe-outline` | **Language** | Push to `profile/language.tsx` — pick `en` or `pt-BR` |
| 4 | `chatbubble-ellipses-outline` | **Talk to Us** | Push to `profile/talk-to-us.tsx` — feedback / suggestions form |

---

## User flows

### 1. Profile card (read)

- **Avatar**: loaded from `profiles.avatar_url` (Supabase Storage, bucket `avatars`). Falls back to initials or emoji.
- **Display name**: `profiles.display_name`. Falls back to email local-part.
- **Bio**: `profiles.bio` (max 160 chars). Optional.
- **Stats row**: live counts from the API (`GET /api/profile`):
  - **Moments**: `count(moments where user_id = uid)`
  - **Wines**: `count(wines where created_by = uid)`
  - **Family**: `1` if user owns or belongs to a family, else `0`

### 2. Edit Profile

Screen: [`apps/mobile/app/profile/edit.tsx`](../../apps/mobile/app/profile/edit.tsx)

- **Avatar**: tap to open image picker (camera / library). Uploads to `avatars/{uid}.jpg` in Supabase Storage, then `PATCH /api/profile` with `avatar_url`.
- **Display name**: text input, 2–50 chars.
- **Bio**: multiline text input, max 160 chars, with character counter.
- **Save** button calls `PATCH /api/profile` with `{ display_name, bio, avatar_url }`.
- On success, pop back; profile tab refetches.

### 3. Notifications (inline toggle)

- Rendered as a `Switch` component directly in the settings row (no chevron, no sub-screen).
- Toggle calls `PATCH /api/profile/settings` with `{ notifications_enabled: true|false }`.
- This controls whether the app should send push notifications. The actual push token registration happens separately (future work), but the preference is stored now.
- **Recommendation**: a simple on/off toggle is the right UX for now. When we add notification categories later (e.g. family activity, new moments, weekly digest), we can upgrade to a dedicated settings sub-screen. For MVP, a single boolean avoids over-engineering.

### 4. Language

Screen: [`apps/mobile/app/profile/language.tsx`](../../apps/mobile/app/profile/language.tsx)

- Two options with radio-style selection:
  - **English (US)** — value `en`
  - **Portugues (BR)** — value `pt-BR`
- Current selection shown with a checkmark.
- Selecting a language calls `PATCH /api/profile/settings` with `{ language: "en" | "pt-BR" }`.
- On change, the app's i18n context updates immediately (requires i18n setup — see "Future work").
- For MVP: store the preference in the profile. Actual string translation is a separate effort.

### 5. Talk to Us

Screen: [`apps/mobile/app/profile/talk-to-us.tsx`](../../apps/mobile/app/profile/talk-to-us.tsx)

- **Header text**: "Talk to Us"
- **Description** (warm, inviting tone):
  > "We'd love to hear from you! Whether you have an idea to make MomentoVino better, want to share feedback about your experience, or just want to tell us about a cool wine moment — we're all ears."
- **Options to contact**:
  - **Email**: opens `mailto:feedback@momentovino.app` via `Linking.openURL`.
  - **Instagram** (optional): link to the MomentoVino IG account.
- No backend needed — this is a static info screen with `Linking` actions.

### 6. Sign Out

- Calls `supabase.auth.signOut()`.
- Clears local state and navigates to the auth/onboarding flow.

---

## Supabase schema

### New table: `profiles` (migration `0009_profiles.sql`)

```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text        not null default '',
  bio          text                 default null,
  avatar_url   text                 default null,
  language     text        not null default 'en',
  notifications_enabled boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'User profile data and preferences';

-- Automatically create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

### Row Level Security

```sql
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can do everything (for the Python API)
create policy "Service role full access"
  on public.profiles for all
  using (auth.role() = 'service_role');
```

### New storage bucket: `avatars`

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
```

---

## HTTP API (Python, `apps/web/api/profile.py`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/profile` | Returns profile + stats: `{ profile, stats: { moments, wines, family } }`. Creates a profile row if missing (backfill for existing users). |
| `PATCH` | `/api/profile` | Update `display_name`, `bio`, `avatar_url`. Body: `{ display_name?, bio?, avatar_url? }`. |
| `PATCH` | `/api/profile/settings` | Update `language`, `notifications_enabled`. Body: `{ language?, notifications_enabled? }`. |

All routes require `Authorization: Bearer <user JWT>`.

### `GET /api/profile` — response shape

```json
{
  "profile": {
    "id": "uuid",
    "display_name": "Sergio",
    "bio": "Wine lover from SP",
    "avatar_url": "https://...supabase.co/storage/v1/object/public/avatars/uid/avatar.jpg",
    "language": "en",
    "notifications_enabled": true,
    "created_at": "...",
    "updated_at": "..."
  },
  "stats": {
    "moments": 23,
    "wines": 47,
    "family": 1
  }
}
```

### `PATCH /api/profile` — validation

| Field | Rules |
|-------|-------|
| `display_name` | 2–50 chars, trimmed |
| `bio` | Max 160 chars, trimmed. Empty string or null clears it. |
| `avatar_url` | Valid URL string or null to remove |

### `PATCH /api/profile/settings` — validation

| Field | Rules |
|-------|-------|
| `language` | Must be one of: `en`, `pt-BR` |
| `notifications_enabled` | Boolean |

---

## Mobile modules

| Path | Role |
|------|------|
| [`features/profile/api.ts`](../../apps/mobile/features/profile/api.ts) | Typed fetch helpers for all profile endpoints |
| [`app/(tabs)/profile.tsx`](../../apps/mobile/app/(tabs)/profile.tsx) | Tab UI — profile card, stats, settings list, sign out |
| [`app/profile/_layout.tsx`](../../apps/mobile/app/profile/_layout.tsx) | Stack layout for profile sub-screens |
| [`app/profile/edit.tsx`](../../apps/mobile/app/profile/edit.tsx) | Edit avatar, name, bio |
| [`app/profile/language.tsx`](../../apps/mobile/app/profile/language.tsx) | Language picker (en / pt-BR) |
| [`app/profile/talk-to-us.tsx`](../../apps/mobile/app/profile/talk-to-us.tsx) | Contact info + mailto link |

---

## Implementation order

1. **Database**: Apply `0009_profiles.sql` migration (table + trigger + RLS + storage bucket)
2. **Backend**: Create `apps/web/api/profile.py` (GET + PATCH endpoints)
3. **Mobile API layer**: Create `features/profile/api.ts`
4. **Profile tab**: Refactor `profile.tsx` to fetch real data, add notification toggle, remove Appearance & Privacy, rename Help & Support → Talk to Us
5. **Sub-screens**: Build `edit.tsx`, `language.tsx`, `talk-to-us.tsx`
6. **Navigation**: Add `profile/_layout.tsx` stack and register it in `app/_layout.tsx`
7. **Backfill**: The trigger handles new users; `GET /api/profile` auto-creates rows for existing users on first access

---

## Future work

- **i18n**: Wire the `language` preference to an i18n library (e.g. `i18next` + `react-i18next`) so strings actually translate.
- **Push notifications**: Register device tokens with Expo Push, respect the `notifications_enabled` flag.
- **Notification categories**: When adding categories, replace the inline toggle with a sub-screen that has per-category switches.
- **Account deletion**: Add a "Delete Account" option under the settings, cascading through profiles → family membership → content.
