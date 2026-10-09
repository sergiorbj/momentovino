# MomentoVino

MomentoVino keeps every wine moment (the bottle, the people, the place, the photos) on a 3D world map you can go back to, and shares it with family and friends. For the product and brand story, see [docs/business-project-context.md](./docs/business-project-context.md).

## Project Structure

Turborepo + pnpm monorepo:

- **Web** (`apps/web`): Next.js 16 + React 19 + Python Vercel Functions (`apps/web/api/`)
- **Mobile** (`apps/mobile`): React Native 0.81 + Expo SDK 54 (Expo Router), iOS
- **Shared Packages** (`packages/`):
  - `types`: Shared TypeScript types
  - `utils`: Shared utility functions
  - `design-tokens`: Color/spacing tokens (`tokens.json`, `web.css`, `mobile.ts`)
  - `typescript-config`: Shared TypeScript configurations
  - `eslint-config`: Shared ESLint configurations
- **Supabase** (`supabase/`): SQL migrations, the `revenuecat-webhook` edge function, auth email templates

## Tech Stack

### Web
- Next.js 16 with App Router, Tailwind CSS, shadcn/ui
- Python 3.12 Serverless Functions on Vercel: wine scanning (Gemini), wines, family, profile, entitlement claim
- Resend for app-side transactional email

### Mobile
- React Native 0.81, Expo SDK 54, Expo Router
- TanStack Query for all server state
- i18next with 5 locales (`en`, `pt-BR`, `pt-PT`, `es`, `it`)
- RevenueCat (`react-native-purchases`) for subscriptions
- Three.js on expo-gl for the globe
- `StyleSheet.create` (no NativeWind)

### Infrastructure
- Supabase: Postgres + RLS, Auth (anonymous, Apple, Google, email), Storage, edge functions
- Vercel for web + API
- EAS Build / Submit for the App Store

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Python 3.12 (for the API functions)
- Xcode (for native iOS builds)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev                   # web + mobile
pnpm dev:web               # Next.js only (Python /api/* returns 404)
pnpm dev:web:with-flask    # Next.js + Flask shim serving the Python /api/* locally
pnpm dev:mobile            # Expo dev server
```

**Python API locally:** `apps/web/api/*.py` are Vercel Python functions and don't run under `next dev`. Use `pnpm dev:web:with-flask` (Flask shim on :5328, proxied by `next.config.ts` in development; creates `apps/web/venv/` on first run) or `vercel dev` inside `apps/web`.

### Building, Linting & Formatting

```bash
pnpm build                 # build all
pnpm lint                  # lint all
pnpm type-check            # tsc --noEmit in every workspace
pnpm format                # prettier --write
```

## Project Commands

### Root
- `pnpm dev`, `pnpm dev:web`, `pnpm dev:web:with-flask`, `pnpm dev:mobile`
- `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm format`
- `pnpm mobile:start` - `expo start`
- `pnpm mobile:prebuild` - regenerate the native iOS project (`expo prebuild --platform ios --clean`)
- `pnpm mobile:ios` - native iOS build and run (`expo run:ios`)
- `pnpm mobile:xcode` - open the Xcode workspace
- `pnpm ios` / `pnpm android` - shortcuts to the mobile scripts

### Web App (`apps/web`)
- `pnpm dev` - Next.js dev server (`dev:lan` binds 0.0.0.0)
- `pnpm dev:flask` - Flask shim only
- `pnpm dev:with-flask` - Next.js + Flask shim
- `pnpm build` / `pnpm start` / `pnpm lint` / `pnpm type-check`

### Mobile App (`apps/mobile`)
- `pnpm dev` / `pnpm start` - Expo dev server
- `pnpm ios` / `pnpm android` - native build and run (`expo run:*`)
- `pnpm build:ios` / `pnpm build:android` - EAS builds
- `pnpm i18n:check` - verify every locale has the same keys
- `pnpm type-check`

## Environment Variables

See `apps/web/.env.example` and `apps/mobile/.env.example` for the full list.

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=                 # scan-wine.py
RESEND_API_KEY=                 # family invite email
RESEND_FROM_EMAIL=
RESEND_SKIP_SEND=false
APPLE_TEAM_ID=                  # optional: Apple token revocation on account deletion
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
APPLE_CLIENT_ID=com.momentovino.app
```

### Mobile (`apps/mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_APPLE_ID=                  # eas submit only, not bundled
```

## Deployment

### Web + API (Vercel)

The web app and Python API are deployed together on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **`apps/web`**
   - Build Command: `cd ../.. && pnpm turbo run build --filter=web`
   - Install Command: `cd ../.. && pnpm install`
3. Add environment variables in Vercel Dashboard
4. Deploy!

### Mobile (App Store)

The mobile app is built and published independently with EAS:

```bash
cd apps/mobile
eas build --platform ios
eas submit --platform ios
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Architecture, conventions and data-layer rules
- [Business & product context](./docs/business-project-context.md) - What the app delivers, audience, brand voice, visual identity
- [Development Guidelines](./docs/general-development-guidelines.md) - Coding standards
- Per-domain mobile docs in [docs/mobile/](./docs/mobile/): moments, scanner, family, profile, onboarding
- Supabase auth email templates: [supabase/templates/auth/README.md](./supabase/templates/auth/README.md)

## License

See [LICENSE](./LICENSE) file for details.
