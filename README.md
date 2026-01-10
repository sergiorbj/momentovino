# MomentoVino

Wine tracking and event management platform built with Turborepo.

## Project Structure

This is a monorepo containing:

- **Web** (`apps/web`): Next.js 16.1 + React 19.2 + Python API
- **Mobile** (`apps/mobile`): React Native 0.83 + Expo SDK 54
- **Shared Packages** (`packages/`):
  - `types`: Shared TypeScript types
  - `utils`: Shared utility functions
  - `typescript-config`: Shared TypeScript configurations
  - `eslint-config`: Shared ESLint configurations

## Tech Stack

### Web
- Next.js 16.1 with App Router
- React 19.2
- Tailwind CSS
- shadcn/ui (to be added)
- Python 3.12 Serverless Functions (Vercel)

### Mobile
- React Native 0.83
- Expo SDK 54
- NativeWind (Tailwind for React Native)
- React Native Reusables (to be added)

### Infrastructure
- Turborepo for monorepo management
- pnpm for package management
- PostgreSQL (Supabase) for database
- Vercel for deployment (web + API)

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Python 3.12 (for API functions)

### Installation

```bash
# Install dependencies
pnpm install

# Install mobile dependencies (note: requires additional setup)
cd apps/mobile && pnpm install
```

### Development

```bash
# Run all apps
pnpm dev

# Run web only
pnpm dev:web

# Run mobile only
pnpm dev:mobile
```

**Note on Python API Functions**: The Python serverless functions in `/apps/web/api` will only work when:
- Deployed to Vercel (production or preview)
- Running locally with `vercel dev` (not `pnpm dev` or `next dev`)

When using `pnpm dev` or `next dev`, the Python API endpoints will return 404. For full local testing including Python functions, install the [Vercel CLI](https://vercel.com/docs/cli) and use `vercel dev` in the `/apps/web` directory.

### Building

```bash
# Build all apps
pnpm build

# Build web only
turbo run build --filter=web
```

### Linting & Formatting

```bash
# Lint all
pnpm lint

# Format all
pnpm format

# Type check all
pnpm type-check
```

## Project Commands

### Root Commands
- `pnpm dev` - Run all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format code with Prettier
- `pnpm dev:web` - Run web app only
- `pnpm dev:mobile` - Run mobile app only

### Web App (`apps/web`)
- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint code
- `pnpm type-check` - Check types

### Mobile App (`apps/mobile`)
- `pnpm dev` / `pnpm start` - Start Expo dev server
- `pnpm android` - Run on Android
- `pnpm ios` - Run on iOS
- `pnpm web` - Run on web
- `pnpm build:android` - Build Android app (requires EAS)
- `pnpm build:ios` - Build iOS app (requires EAS)

## Environment Variables

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Mobile (`apps/mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000/api
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

### Mobile (App Stores)

The mobile app is built and published independently:

```bash
cd apps/mobile

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```

## Documentation

- [Monorepo Structure](./docs/monorepo-structure.md) - Detailed architecture and setup guide
- [Development Guidelines](./docs/general-development-guidelines.md) - Coding standards

## Next Steps

1. Setup shadcn/ui in web app
2. Setup React Native Reusables in mobile app
3. Configure Supabase and create database schema
4. Implement authentication
5. Create Python API endpoints (CRUD operations)
6. Build initial mobile screens

## License

See [LICENSE](./LICENSE) file for details.
