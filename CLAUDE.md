# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MomentoVino is an app that stores moments and wines shared with family and friends. The app was developed for customers who are not specialized in wines, but persons who likes to taste a good one and also keep it in memory.

## Commands

All root commands proxy through Turborepo and expect pnpm.

```bash
pnpm install               # install all workspaces
pnpm dev                   # run web + mobile in parallel
pnpm dev:web               # Next.js dev server only (Python API returns 404 here — see note below)
pnpm dev:mobile            # Expo dev server only
pnpm dev:web:with-flask    # Next.js + Flask shim (exposes Python /api/* locally)
pnpm build                 # turbo build (all)
pnpm lint                  # turbo lint
pnpm type-check            # turbo tsc --noEmit (all workspaces)
pnpm format                # prettier --write

# Mobile-specific (also accessible as pnpm --filter mobile <script>)
pnpm mobile:start          # expo start
pnpm mobile:prebuild       # expo prebuild --platform ios --clean (regenerates native iOS project)
pnpm mobile:ios            # expo run:ios (native build)
pnpm mobile:xcode          # open the generated Xcode workspace
pnpm ios / pnpm android    # shortcuts to mobile ios/android scripts
```

From `apps/web`: `pnpm dev:flask` runs the local Flask shim alone; `pnpm dev:with-flask` runs both in one script.

### Python API local dev gotcha

`apps/web/api/*.py` are **Vercel Python Serverless Functions** using `BaseHTTPRequestHandler`. They do **not** run under `next dev`. For local testing of endpoints like `/api/scan-wine` you have two options:

1. `pnpm dev:web:with-flask` — uses `apps/web/api/flask_dev.py` (Flask shim) to serve the handlers locally. This is what the mobile app hits via `EXPO_PUBLIC_API_URL`.
2. `vercel dev` inside `apps/web` — actual Vercel runtime.

The shim creates a Python venv in `apps/web/venv/` on first run (see `scripts/run-flask.sh`).

### Environment files required

- `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY` (for `scan-wine.py`).
- `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` (points at the Next.js/Flask host), `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`.

## Architecture

### Monorepo layout

- `apps/web` — Next.js 16 App Router **plus** Python Vercel Functions in `apps/web/api/`. Deployed as a **single Vercel project**: frontend at `/` and Python handlers at `/api/*`. `vercel.json` sets build/install to run from the repo root.
- `apps/mobile` — React Native 0.83 + Expo SDK 55 (Expo Router). Independent deploy via EAS Build → App Store / Play Store.
- `packages/types` — shared TS types (`wine.ts`, `moment.ts`, `event.ts`, `user.ts`).
- `packages/utils` — shared pure utilities.
- `packages/design-tokens` — single source of truth for colors/spacing/radii. Exposes `web.css` (CSS vars) and `mobile.ts` (TS constants). Sourced from `tokens.json`.
- `packages/typescript-config` — base/nextjs/react-native tsconfigs consumed via `@momentovino/typescript-config`.
- `packages/eslint-config` — shared ESLint presets.
- `supabase/migrations/` — raw SQL migrations (numbered `000N_*.sql`), applied manually to Supabase. `supabase/scripts/` holds helper scripts.

### Mobile split: Supabase direct vs Python API

The mobile client talks to **two** backends:

1. **Supabase directly** (via `apps/mobile/lib/supabase.ts`) for CRUD on `wines`, `moments`, `moment_photos`, `families`, `profiles`, and for storage uploads (`moment-photos`, `wine-labels`, `family-covers` buckets). Auth state is persisted in `AsyncStorage`; `lib/session.ts` has `ensureAnonymousSession()` for guest bootstrapping.
2. **Next.js/Python API** (via `apps/mobile/lib/api-base.ts` → `getApiBaseUrl()`) for AI-backed operations only. Currently `POST /api/scan-wine` calls Gemini Vision (`apps/web/api/scan-wine.py`) and returns structured wine data. The base URL resolver in `api-base.ts` rewrites `localhost` → the Metro LAN host in `__DEV__` so physical devices/Expo Go can reach your dev machine.

When building a new mobile feature: Supabase RLS + the generated `lib/database.types.ts` is the default. Only introduce a Python endpoint when server-side secrets (like `GEMINI_API_KEY`) or non-trivial processing are required.

### Mobile feature folder convention

`apps/mobile/features/<domain>/` owns the domain's data layer:

- `api.ts` — functions that wrap Supabase calls and/or fetches to `getApiBaseUrl()`. Screens do **not** call `supabase` directly and generally do **not** import `api.ts` directly either — they go through `hooks.ts` so reads/writes go through the React Query cache (see below).
- `hooks.ts` — React Query hooks wrapping the api layer (e.g. `useMoments`, `useMomentDetail`, `useCreateMoment`, `useInviteMember`). This is the entry point for screens.
- `schema.ts` — Zod schemas and derived types (e.g. `features/moments/schema.ts`, `WINE_TYPES`).
- `types.ts` — pure type aliases.
- Additional domain helpers live as named files (e.g. `features/wines/similarity.ts` clusters duplicate wines, `features/scanner/pending-label-photo.ts` is a tiny module-level mutable handoff between the scanner camera screen and the result screen).

Routes in `apps/mobile/app/` (Expo Router, file-based) should stay presentational — pull data via `features/<domain>/hooks.ts`. Direct `api.ts` calls from screens are only OK for non-cached one-shots (e.g. the scanner's `scanWineImage`).

### Mobile data layer — React Query is the standard

All server state on mobile flows through **TanStack Query** (`@tanstack/react-query`). The cache itself is the state — there is no Context API or Zustand store for server data. Before adding a new fetch or mutation, check if a hook already exists.

- **QueryClient**: single instance in [apps/mobile/lib/query-client.ts](apps/mobile/lib/query-client.ts), mounted via `QueryClientProvider` in [apps/mobile/app/_layout.tsx](apps/mobile/app/_layout.tsx). Defaults: `staleTime: 30_000`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`.
- **Query keys**: centralized in [apps/mobile/lib/query-keys.ts](apps/mobile/lib/query-keys.ts). Always add/reuse keys here — never inline them in components — so invalidation stays consistent.
- **Reads**: expose as `useXxx()` in `features/<domain>/hooks.ts` wrapping `useQuery`. Screens destructure `{ data, isLoading }`; they do **not** manage their own `useState`/`useEffect` loading.
- **Writes**: expose as `useXxxMutation()` using `useMutation`. The hook is responsible for `invalidateQueries` in `onSuccess`. Cross-domain invalidation matters:
  - Creating/deleting a **wine** → invalidate `['wines']` + `queryKeys.profile` + `queryKeys.momentStats`.
  - Creating a **moment** → invalidate `['moments']` + `['wines']` + `queryKeys.profile`. Helper `invalidateMomentSurfaces(qc)` in [features/moments/hooks.ts](apps/mobile/features/moments/hooks.ts) already does this.
  - Creating a **family** → invalidate `queryKeys.family` + `queryKeys.profile`.
  - Updating family / inviting members → invalidate `queryKeys.family`.
- **No `useFocusEffect`-driven reloads**. Tabs rely on the cache; mutations invalidate the right keys, so a focused tab already has fresh data. Don't reintroduce `setLoading(true)` on focus.
- **Boot prefetch**: [apps/mobile/lib/prefetch.ts](apps/mobile/lib/prefetch.ts) fires parallel `prefetchQuery` calls for profile, moment stats, moments list, wines list + count, and family dashboard right after `ensureAnonymousSession()` resolves. That's why tabs open with data already in cache. If you add a new top-level tab query, add it to `prefetchCoreData` too.
- **When to call `api.ts` directly from a screen**: only for fire-and-forget one-shots that don't need caching or invalidation (e.g. the scanner uploading a label photo). Anything that shows data or changes state that another screen reads → add a hook.

### Mobile navigation shape

- `app/_layout.tsx` is the root stack. It gates render on three async states: fonts loaded, Supabase session established, onboarding flag read. Only after all three resolve does it hide the splash and show the stack.
- Top-level stack children: `(tabs)`, `onboarding`, `login`, `moments`, `scanner`, `family`, `profile`.
- Tabs: `moments`, `wines`, `scanner`, `family`, `profile` (`app/(tabs)/_layout.tsx`).
- **Wines can only be added via the scanner flow.** The wines tab has no create form; its CTA routes to `/(tabs)/scanner`. The scanner produces a wine via `features/scanner/api.ts::createWineViaApi` (which POSTs to the Python `/api/wines` handler), then optionally jumps to `/moments/new` to log a moment for it.

### Design tokens on mobile

Mobile screens currently declare colors as local `const` at the top of each file (WINE `#722F37`, INK `#3F2A2E`, SUBTLE `#C2703E`, BG `#F5EBE0`, BROWN `#5C4033`). These mirror `packages/design-tokens/mobile.ts` but are not currently imported from it. Keep new screens consistent with the same palette. Fonts come from `@expo-google-fonts` (`DMSerifDisplay_400Regular` for titles, `DMSans_{400,500,600,700}` for body).

NativeWind / Tailwind is **not** used on mobile (removed). Use `StyleSheet.create`. Web still uses Tailwind with shadcn/ui conventions.

### Database and storage

- Migrations live in `supabase/migrations/` and must be applied in order. The numbering has gaps (0006 skipped); new migrations take the next integer.
- `apps/mobile/lib/database.types.ts` is the generated Supabase types file — regenerate it (not by hand) when the schema changes.
- Storage buckets referenced by code: `moment-photos` (moment images), `wine-labels` (wine label shots from scanner/manual upload — see migration 0004), `family-covers`. `features/moments/api.ts` and `features/scanner/api.ts` contain the upload helpers (`attachWineLabelPhoto`, etc.).

### Onboarding

`app/onboarding/` is a separate stack with a fixed screen order (`index → pain → atlas → demo → goal → account → paywall`). The completion flag is stored via `features/onboarding/state.ts` and checked by the root layout; `features/onboarding/seed.ts` and `starter-deck.ts` seed initial data after account creation.

## Conventions

- Imports from workspace packages use the `@momentovino/*` prefix (see `pnpm-workspace.yaml`).
- Mobile path alias `@/*` maps to the `apps/mobile/` root (see its `tsconfig.json`).
- Early-return validation over nested conditionals; only use try/catch when the outer scope isn't already handling errors (`docs/general-development-guidelines.md`).
- Per-domain documentation lives in `docs/mobile/<domain>/` and `docs/<feature>/` — check there before redesigning a flow.
