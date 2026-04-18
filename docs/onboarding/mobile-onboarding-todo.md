# Mobile Onboarding — Remaining Work

Snapshot of what's missing to ship a 100% functional onboarding + login flow for the MomentoVino mobile app (Expo / React Native). Every screen 1–7 is implemented and navigable end-to-end; the items below are the stubs, edge cases, and integrations that still need real wiring before we can call the flow production-ready.

File references point to the code that currently holds a placeholder.

## 1. Authentication — third-party sign-in

The email path works today: [account.tsx:64-83](apps/mobile/app/onboarding/account.tsx#L64-L83) calls `supabase.auth.updateUser({ email, password })`, which upgrades the anonymous session in place and preserves the `user_id` seeded by `/onboarding/atlas`. Apple and Google are UI stubs that fire `Alert.alert`.

### 1.1 Apple sign-in ([account.tsx:49-56](apps/mobile/app/onboarding/account.tsx#L49-L56))

- [ ] Install `expo-apple-authentication` and add the capability in `app.json` (`ios.usesAppleSignIn: true`).
- [ ] Request `FULL_NAME` + `EMAIL` scopes and capture the `identityToken` and a cryptographically random `nonce`.
- [ ] Call `supabase.auth.linkIdentity({ provider: 'apple', credential: { id_token, nonce } })` — **linkIdentity, not signIn** — so the current anonymous `user_id` (and the seeded wines/moments) stays attached to the upgraded account.
- [ ] Handle the `SIGN_IN_CANCELLED` / `SIGN_IN_FAILED` error codes without surfacing a generic "something went wrong" Alert.
- [ ] Configure the Apple provider in the Supabase dashboard (Services ID, Team ID, Key ID, private key).
- [ ] Only show the Apple button on iOS — the guard is already in place at [account.tsx:118](apps/mobile/app/onboarding/account.tsx#L118).

### 1.2 Google sign-in ([account.tsx:58-62](apps/mobile/app/onboarding/account.tsx#L58-L62))

- [ ] Pick a library: `@react-native-google-signin/google-signin` (native, best UX) or `expo-auth-session/providers/google` (works in Expo Go).
- [ ] Create iOS and Android OAuth clients in Google Cloud Console; add URL schemes to `app.json`.
- [ ] Fetch the `idToken` and call `supabase.auth.linkIdentity({ provider: 'google', credential: { id_token } })`.
- [ ] Configure the Google provider in the Supabase dashboard.
- [ ] Same identity-preservation contract as Apple: **link, don't sign in**, or the seeded onboarding data orphans.

### 1.3 Shared post-link work

- [ ] After `linkIdentity` resolves, route to `/onboarding/paywall` — same terminal as the email path.
- [ ] Profile row is auto-created by the `on_auth_user_created` trigger (see `0009_profiles.sql`), but `display_name` falls back to the email prefix. If Apple/Google return `full_name`, PATCH `profiles.display_name` right after linking so the user doesn't see an ugly default.

## 2. Dedicated login route

**Status: shipped** — [apps/mobile/app/login.tsx](apps/mobile/app/login.tsx) registered in the root Stack ([app/_layout.tsx](apps/mobile/app/_layout.tsx)). Entry points wired:

- Welcome screen "I already have an account" → `router.push('/login')`.
- Account screen "I already have an account" → `router.push('/login')`.

The screen supports email/password sign-in via `supabase.auth.signInWithPassword`, a "Forgot password?" link via `supabase.auth.resetPasswordForEmail`, and Apple/Google buttons as stubs (same TODOs as the account screen — see §1).

### Remaining behaviour decisions

- [ ] Confirm the chosen semantics for users with a local anonymous session + seeded picks: the current implementation **silently discards** them on sign-in (option 1). If the product prefers a warning modal (option 2) or a server-side merge (option 3), revisit [login.tsx:56-72](apps/mobile/app/login.tsx#L56-L72).
- [ ] Hook Apple/Google sign-in using `supabase.auth.signInWithIdToken` (no anon session to preserve here — different from the onboarding account flow which uses `linkIdentity`).
- [ ] Handle the password-reset redirect URL: Supabase needs a configured redirect-to URL for the magic link to land back in the app via `expo-linking`.

## 3. Paywall — RevenueCat integration

[paywall.tsx](apps/mobile/app/onboarding/paywall.tsx) renders the full visual design and routes to `/(tabs)/moments` on success, but the purchase call is mocked: [paywall.tsx:34-52](apps/mobile/app/onboarding/paywall.tsx#L34-L52) calls `markOnboardingCompleted()` without actually charging anyone.

### 3.1 Purchase flow

- [ ] Install `react-native-purchases` and configure the SDK in the app root (`_layout.tsx`) with the RevenueCat public key.
- [ ] Create the `pro` entitlement and a monthly package (`$5.99/month`, 5-day free trial) in the RevenueCat dashboard, mirrored in App Store Connect and Play Console.
- [ ] Identify the user in RevenueCat using the Supabase `user.id` (`Purchases.logIn(userId)`) so the subscription survives reinstalls and devices.
- [ ] Replace the TODO block in `startTrial()`:
  ```ts
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.monthly
  if (!pkg) throw new Error('No offering available')
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  if (!customerInfo.entitlements.active['pro']) throw new Error('Trial not active')
  ```
- [ ] Only call `markOnboardingCompleted()` + `resetSelections()` after the entitlement is confirmed active.

### 3.2 Restore purchases ([paywall.tsx:54-57](apps/mobile/app/onboarding/paywall.tsx#L54-L57))

- [ ] Call `Purchases.restorePurchases()`; if `entitlements.active['pro']` is present, complete onboarding and route to `/(tabs)/moments`. Otherwise show a neutral "No active subscription found" message.

### 3.3 Terms & Privacy links ([paywall.tsx:118-124](apps/mobile/app/onboarding/paywall.tsx#L118-L124))

- [ ] The two tiny links (`Terms`, `Privacy`) are inert `TouchableOpacity` elements. Point them at real URLs via `Linking.openURL(...)` once the legal pages exist.

### 3.4 Receipt validation / webhooks

- [ ] Configure a RevenueCat webhook → Supabase edge function to persist subscription state in a `subscriptions` table (table does not exist yet). Needed so server-side features (e.g., the share feature on the atlas) can gate by entitlement.

## 4. Storage RLS issue — seeded moment photos

Known issue documented in [onboarding/seed.ts](apps/mobile/features/onboarding/seed.ts): the bundled starter PNG is not uploaded to the `moment-photos` bucket. Uploading failed RLS on `storage.objects` for anonymous sessions even though the wine/moment inserts (same JWT) succeeded and the policy/path/grants all looked correct.

### Current behavior

Seeded moments ship with `cover_photo_url = null`. Both the moments list and detail views already render a wine-icon placeholder for null covers, so nothing breaks — the user is just prompted (implicitly) to add their own photo.

### Options if we want to revisit

- [ ] Enhance client-side error dumping in `uploadPhoto` ([api.ts:103-125](apps/mobile/features/moments/api.ts#L103-L125)) to log `statusCode`, `error`, and the raw response body so we can see what the storage service is actually complaining about.
- [ ] Try a `security definer` SQL function that inserts into `storage.objects` on behalf of the anon user, bypassing the RLS check for this specific onboarding path.
- [ ] Alternatively, only run the seed after the user has upgraded to a non-anonymous session (move the seed from `/onboarding/atlas` to right after `linkIdentity`/`updateUser` completes). This reorders the flow though, and undermines the "show them value before asking for an account" psychology of the current design.

## 5. Analytics & personalization

Onboarding answers (goal, pain points, wine picks) are saved only in an in-memory store ([features/onboarding/selections.ts](apps/mobile/features/onboarding/selections.ts)) and cleared when the paywall finishes ([paywall.tsx:44](apps/mobile/app/onboarding/paywall.tsx#L44)).

### TODO

- [ ] Decide whether to persist these to Supabase (e.g., `profiles.onboarding_goal`, `profiles.onboarding_pain_points`) for future personalization / re-engagement.
- [ ] Send the responses to an analytics provider (PostHog, Mixpanel, etc.) before clearing them — they're the richest signal we'll ever have about user intent.
- [ ] Tag the funnel: fire events on each screen (`onboarding_welcome_viewed`, `onboarding_goal_selected`, `onboarding_deck_completed`, `onboarding_account_created`, `onboarding_paywall_started`, `onboarding_paywall_purchased`). Essential for measuring drop-off once we start running experiments.

## 6. Edge cases in the current screens

- [ ] **Anonymous session failure**: `ensureAnonymousSession()` runs on app mount; if it fails (network, Supabase outage, `signInAnonymously` disabled server-side), every screen past Welcome will throw when it calls `supabase.auth.getUser()`. Today there is no user-facing recovery path — add a retry surface on the Welcome screen.
- [ ] **Back button on paywall**: hardware back on Android currently exits onboarding without clearing selections. Either disable back on the paywall or call `resetSelections()` + route to `/onboarding` on back.
- [ ] **Atlas retry**: [atlas.tsx:122-141](apps/mobile/app/onboarding/atlas.tsx#L122-L141) retries the seed directly; a second failure will also have created orphan rows (already happened during dev — see `seed.ts` comment). Add idempotency or dedupe on retry.
- [ ] **Deep-link resume**: if the user backgrounds the app mid-onboarding and relaunches, they land back at `/(tabs)/moments` (because `_layout.tsx` checks `onboardingCompleted`). That's fine only if we've persisted enough state to know where they stopped — currently we don't.
- [ ] **Demo deck keyboard**: the swipe deck uses `PanResponder`; on rare devices with RTL locales, the interpolation for the "SKIP/PICK" badges is mirrored. Low priority, but worth a smoke test before shipping.

## 7. QA checklist before release

- [ ] End-to-end run on a real iOS device, fresh install, anonymous user (happy path through paywall trial).
- [ ] End-to-end run on a real Android device (notifications permission on Android 13+, Google sign-in).
- [ ] Kill the app after each screen (1–7) and relaunch — verify we resume sensibly (or hard-restart the flow, whichever we decide).
- [ ] Sign out, re-sign in via `/login`, confirm seeded atlas is still there.
- [ ] Subscribe, cancel trial in Settings, confirm paywall blocks next launch.
- [ ] Airplane mode at each screen — no crashes, clear error states.
- [ ] Screenshots of each screen in English and `pt-BR` (profile language toggle exists per `0009_profiles.sql`) — i18n is not wired yet in onboarding; every string is currently hard-coded in English.

## 8. i18n

- [ ] Extract all onboarding copy into a translation file (library TBD — `i18next`, `expo-localization`, or similar).
- [ ] Confirm Portuguese copy with the product owner (user is a native `pt-BR` speaker).
- [ ] Honor `profiles.language` when the user is already authenticated on the `/login` flow.

---

## Priority summary

| Priority | Items |
|---|---|
| **P0 — blockers for release** | 1.1 Apple sign-in · 1.2 Google sign-in · 2 Login route · 3.1 RevenueCat purchase flow · 3.2 Restore purchases · 6 Anonymous session failure recovery |
| **P1 — strongly recommended** | 3.3 Terms/Privacy links · 3.4 Receipt webhook · 4 Storage RLS (or formal decision to keep the current null-cover behavior) · 5 Analytics events |
| **P2 — polish** | 5 Onboarding answer persistence · 6 remaining edge cases · 7 QA checklist · 8 i18n |
