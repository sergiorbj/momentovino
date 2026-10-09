# Mobile Onboarding: flow and open items

First-run flow for new users. It is moment-first: the user writes their first moment, adds the bottle by scanning it, sees it pinned on the atlas, starts the trial, and only then creates an account. Copy lives under `onboarding.*` in `features/i18n/locales/*.json`.

## Flow

```
index → goal → pain → intro-create → new-moment-onb ⇄ (scanner-onb → scan-result-onb)
      → atlas → paywall → save-account → [complete-profile] → /(tabs)/moments
```

| Screen | What happens |
|---|---|
| `index` | Spinning globe + "Keep every moment in a world you can go back to." "I already have an account" → `/login` |
| `goal`, `pain` | Multi-select answers kept in memory (`features/onboarding/selections.ts`) |
| `intro-create` | Three steps: write the moment, add the bottle, see it on the atlas |
| `new-moment-onb` | Moment form (title, place, date, photo). The bottle is required: "Add bottle" pushes the scanner; "Change" rescans |
| `scanner-onb` / `scan-result-onb` | `scanWineImage`; "Add to moment" returns with `router.dismissTo('/onboarding/new-moment-onb')`, so the form keeps its fields |
| `atlas` | The moment as the first pin: "One moment, one bottle." |
| `paywall` | RevenueCat purchase (monthly preselected with a 3-day trial, annual) or restore. Schedules a trial reminder (`lib/notifications/trial-reminder.ts`). Back gesture disabled |
| `save-account` | Apple, Google, or email + password. Email signup runs `finalizeAccount` here and enters the app; Apple and Google continue to `complete-profile` |
| `complete-profile` | Display name and legal consent, then `finalizeAccount` and enter the app |

## Persistence

Nothing is written to the database during onboarding. The wine and moment stay in module state (`features/onboarding/onboarding-capture.ts`). After auth, `finalize-account.ts` creates the wine (`createWineViaApi`), the moment, and the photos under the final `user_id`, then marks onboarding complete (`features/onboarding/state.ts`). This matters because Apple and Google sign-in use `signInWithIdToken`, which can swap the anonymous `user_id`. The anonymous session's purchase is carried over by `lib/auth/anon-entitlement.ts` → `POST /api/claim-anon-entitlement`.

After onboarding, `app/index.tsx` redirects users without Pro to `/paywall` (the same design, outside the onboarding stack). Pro status comes only from Supabase (`user_entitlement` view).

## Open items

- [ ] **Terms and Privacy links** on both paywalls (`app/onboarding/paywall.tsx`, `app/paywall.tsx`) are `TouchableOpacity`s with no `onPress`. Point them at the legal pages.
- [ ] **Analytics:** no SDK yet. The goal and pain answers are cleared without being persisted or sent anywhere. Decide whether to store them (e.g. on `profiles`) and add funnel events per screen.
- [ ] **Login over an anonymous session:** `login.tsx` discards local onboarding selections and capture on sign-in. Confirm this is the intended product behavior.
- [ ] **Anonymous session failure:** if `ensureAnonymousSession()` fails at boot, check there's a recovery path (`app/no-connection.tsx` covers the offline case).
- [ ] **Resume mid-onboarding:** the capture is module state, so killing the app mid-flow loses it. Decide whether that's acceptable.
- [ ] **QA pass** on a fresh install in each of the 5 languages: happy path through trial, restore, sign out and back in, airplane mode at each screen.
