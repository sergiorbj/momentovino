# Mobile Profile: identity, subscription, settings, account

The **Profile** tab shows who the user is, their Pro status, settings, and account actions.

## Screen (`app/(tabs)/profile.tsx`)

```
┌─────────────────────────┐
│  Profile                │
│     (avatar)            │  avatar_url or initials
│   Display Name          │
│   @username             │
│   bio                   │
├─────────────────────────┤
│ Subscription  (iOS)     │  Pro (renews/expires on …) · billing issue · Free plan
│ [ Restore purchases ]   │
├─────────────────────────┤
│ ✎  Edit profile       › │  /profile/edit
│ 文 Language            › │  /profile/language
│ ✉  Talk to us         › │  /profile/talk-to-us
├─────────────────────────┤
│ Sign out                │
│ Delete account          │
└─────────────────────────┘
```

- **Subscription card** (iOS only) reads `useEntitlement()` (`features/entitlement`), which reads the `user_entitlement` view (the `pro_*` columns on `profiles`, honoring `pro_expires_at`). Supabase is the only source of truth; the RevenueCat webhook (`supabase/functions/revenuecat-webhook`) writes those columns. **Restore** calls `restorePurchases()` from `lib/purchases.ts`, then refetches the entitlement.
- **Sign out** and **Delete account** confirm through `Alert`. Delete uses a two-step confirmation and is wrapped in `requireOnline`.

## Sub-screens (`app/profile/`)

| Route | Purpose |
|---|---|
| `edit.tsx` | Avatar (photo library → `avatars` bucket, `features/profile/avatar-upload.ts`), display name, `@username`, bio |
| `language.tsx` | Picks one of `en`, `pt-BR`, `pt-PT`, `es`, `it` (`features/i18n/types.ts`) |
| `talk-to-us.tsx` | Opens `mailto:feedback@sergiobernardi.dev` |

## Data

`profiles` (`0009_profiles.sql`, `0013_profile_language_expand.sql`): `display_name`, `username`, `bio`, `avatar_url`, `language`, `notifications_enabled`, plus the `pro_*` entitlement columns (`0010_entitlements.sql`).

| Operation | Transport |
|---|---|
| Read profile | `GET /api/profile` → `{ profile }` (creates it on first read) |
| Update name, bio, avatar | `PATCH /api/profile` |
| Username | Supabase RPCs `claim_username` / `set_username` |
| Language and notifications | Supabase directly (RLS) via `updateSettings`. Language is also mirrored to auth user metadata, because Supabase auth email templates read `.Data.language` |
| Delete account | `DELETE /api/profile` (optional `apple_authorization_code`): purges storage, revokes the Apple token (`_apple.py`, skipped when `APPLE_*` env is unset), deletes the `auth.users` row, which cascades everything else |

`syncAccountLanguage()` runs at boot (`app/_layout.tsx`) so auth metadata matches the app language.

Hooks (`features/profile/hooks.ts`): `useProfile`, `useUpdateProfile`, `useUpdateSettings`, `useSetUsername`, `useDeleteAccount`.

## i18n

All copy is under `profile.*` in `features/i18n/locales/*.json`. Changing the language calls `i18n.changeLanguage`, stores it locally (`features/i18n/storage.ts`), and saves it through `updateSettings`.
