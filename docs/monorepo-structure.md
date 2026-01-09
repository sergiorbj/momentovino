# Plan: MomentoVino Monorepo Structure

## Executive Summary

Create a monorepo structure using Turborepo to manage 3 applications:
- **Web**: Next.js + shadcn/ui (Vercel deploy)
- **API**: Python Functions (Vercel deploy - same project as Web)
- **Mobile**: React Native + Expo + React Native Reusables (independent deploy - App Store)

## Technical Decisions (Research Phase)

### Approved Stack
- **Monorepo Tool**: Turborepo
- **Package Manager**: pnpm
- **Web**: Next.js 16.1 + React 19.2 + shadcn/ui + Tailwind CSS
- **API**: Python 3.12 Vercel Functions (using BaseHTTPRequestHandler - no Flask needed)
- **Mobile**: React Native 0.83 + Expo SDK 54 + React Native Reusables + NativeWind
- **Database**: PostgreSQL (Supabase)
- **Linting/Format**: ESLint + Prettier (shared configuration)
- **TypeScript**: Shared configs via `/packages/typescript-config/`

### Deploy Architecture
- **Single Vercel Project**: `/apps/web` (contains Next.js + Python API)
  - Frontend: `momentovino.vercel.app`
  - API: `momentovino.vercel.app/api/*`
- **Mobile**: Independent (Expo EAS Build → App Store/Play Store)

### Design Systems
- **Web**: shadcn/ui (copy-paste components)
- **Mobile**: React Native Reusables (copy-paste components, shadcn-like)
- **Strategy**: Separate design systems, sharing commom packages via `/packages/types` and `/packages/utils`

## Final Folder Structure

```
momentovino/
├── apps/
│   ├── web/                      # Next.js + Python API (single Vercel deploy)
│   │   ├── api/                  # 🐍 Python Serverless Functions
│   │   │   └── health.py         # GET /api/health
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── globals.css
│   │   │   └── (routes)/
│   │   ├── components/           # shadcn/ui components
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── public/
│   │   ├── requirements.txt      # Python dependencies
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vercel.json           # Multi-runtime config
│   │   └── .env.example
│   │
│   └── mobile/                   # React Native + Expo
│       ├── app/                  # Expo Router
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   └── (tabs)/
│       ├── components/    # React Native Reusables components
│       ├── lib/
│       │   └── utils.ts
│       ├── assets/
│       ├── app.json             # Expo config
│       ├── eas.json             # EAS Build config
│       ├── package.json
│       ├── tailwind.config.js   # NativeWind config
│       ├── tsconfig.json
│       └── .env.example
│
├── packages/
│   ├── typescript-config/       # Shared TypeScript configs
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── react-native.json
│   ├── eslint-config/           # Shared ESLint configs
│   │   ├── base.js
│   │   ├── next.js
│   │   └── react-native.js
│   ├── types/                   # Shared TypeScript types
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── wine.ts
│   │   └── event.ts
│   └── utils/                   # Shared utilities
│       ├── index.ts
│       ├── date.ts
│       └── validation.ts
│
├── docs/
│   ├── general-development-guidelines.md
│   └── monorepo-structure.md    # This document
│
├── turbo.json                   # Turborepo config
├── package.json                 # Root package.json
├── pnpm-workspace.yaml          # pnpm workspaces
├── .gitignore
├── .prettierrc
├── .prettierignore
├── LICENSE
└── README.md
```

## Main Configuration Files

### 1. `/turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

### 2. `/pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 3. `/package.json` (root)
```json
{
  "name": "momentovino",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "dev:web": "turbo run dev --filter=web",
    "dev:mobile": "turbo run dev --filter=mobile"
  },
  "devDependencies": {
    "prettier": "^3.2.5",
    "turbo": "^2.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### 4. `/apps/web/vercel.json`
```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.12"
    }
  }
}
```

### 5. `/apps/web/next.config.ts`
```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@momentovino/types', '@momentovino/utils'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*'
      }
    ]
  }
}

export default config
```

### 6. `/apps/web/requirements.txt`
```txt
# No Flask needed! Vercel Functions use BaseHTTPRequestHandler
# Add only the Python packages you actually need, for example:
# requests==2.31.0
# python-dotenv==1.0.1
```

### 7. `/apps/web/package.json`
```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vercel dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^16.1.1",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "@momentovino/types": "workspace:*",
    "@momentovino/utils": "workspace:*",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.20",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17",
    "@momentovino/typescript-config": "workspace:*",
    "@momentovino/eslint-config": "workspace:*",
    "eslint": "^8.57.0"
  }
}
```

### 8. `/apps/mobile/package.json`
```json
{
  "name": "mobile",
  "version": "0.1.0",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "~5.0.0",
    "react": "19.2.3",
    "react-native": "0.83.0",
    "nativewind": "^4.0.1",
    "react-native-reusables": "^0.7.0",
    "@momentovino/types": "workspace:*",
    "@momentovino/utils": "workspace:*"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~19.0.0",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "@momentovino/typescript-config": "workspace:*",
    "@momentovino/eslint-config": "workspace:*",
    "eslint": "^8.57.0"
  }
}
```

### 9. `/packages/types/package.json`
```json
{
  "name": "@momentovino/types",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts"
}
```

### 10. `/packages/utils/package.json`
```json
{
  "name": "@momentovino/utils",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts"
}
```

### 11. `/.prettierrc`
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

## Implementation Plan

### Phase 1: Initial Monorepo Setup
1. Initialize pnpm workspace
2. Create base folder structure (`apps/`, `packages/`, `docs/`)
3. Create root `package.json` with Turborepo scripts
4. Create `turbo.json` with pipeline configuration
5. Create `pnpm-workspace.yaml`
6. Create global `.gitignore`
7. Create `.prettierrc` and `.prettierignore`

### Phase 2: Shared Packages Setup
1. **typescript-config**:
   - `base.json`, `nextjs.json`, `react-native.json`
2. **eslint-config**:
   - `base.js`, `next.js`, `react-native.js`
3. **types**:
   - `package.json`, `index.ts`, `user.ts`, `wine.ts`, `event.ts`
4. **utils**:
   - `package.json`, `index.ts`, `date.ts`, `validation.ts`

### Phase 3: Web App Setup (Next.js + Python)
1. Create Next.js 15 base structure
2. Configure App Router (`app/layout.tsx`, `app/page.tsx`)
3. Configure Tailwind CSS
4. Create `/api` structure for Python functions
5. Create `requirements.txt` with Python dependencies
6. Create `vercel.json` with multi-runtime config
7. Configure `next.config.ts` with rewrites
8. Create basic examples:
   - `/api/health.py` (Python)
   - `/app/page.tsx` (Next.js)
9. Create `.env.example`

### Phase 4: Mobile App Setup (React Native + Expo)
1. Initialize Expo project with TypeScript
2. Configure Expo Router
3. Configure NativeWind (Tailwind for React Native)
4. Create base structure (`app/_layout.tsx`, `app/index.tsx`)
5. Configure `app.json` and `eas.json`
6. Create `.env.example`

### Phase 5: Integration and Testing
1. Test build all apps: `pnpm build`
2. Test dev mode: `pnpm dev`
3. Test lint: `pnpm lint`
4. Test type-check: `pnpm type-check`
5. Test shared packages imports
6. Test `vercel dev` for Web + Python API locally

### Phase 6: Documentation
1. Update README.md with setup instructions
2. Create `docs/monorepo-structure.md` (this document)
3. Add useful commands to README

## Critical Files to Create

### Root Level
- `/package.json`
- `/turbo.json`
- `/pnpm-workspace.yaml`
- `/.gitignore`
- `/.prettierrc`
- `/.prettierignore`
- `/README.md`

### Web App
- `/apps/web/package.json`
- `/apps/web/next.config.ts`
- `/apps/web/vercel.json`
- `/apps/web/tailwind.config.ts`
- `/apps/web/tsconfig.json`
- `/apps/web/requirements.txt`
- `/apps/web/app/layout.tsx`
- `/apps/web/app/page.tsx`
- `/apps/web/app/globals.css`
- `/apps/web/api/health.py`
- `/apps/web/.env.example`

### Mobile App
- `/apps/mobile/package.json`
- `/apps/mobile/app.json`
- `/apps/mobile/eas.json`
- `/apps/mobile/tailwind.config.js`
- `/apps/mobile/tsconfig.json`
- `/apps/mobile/app/_layout.tsx`
- `/apps/mobile/app/index.tsx`
- `/apps/mobile/.env.example`

### Packages
- `/packages/typescript-config/package.json`
- `/packages/typescript-config/base.json`
- `/packages/typescript-config/nextjs.json`
- `/packages/typescript-config/react-native.json`
- `/packages/eslint-config/package.json`
- `/packages/eslint-config/base.js`
- `/packages/eslint-config/next.js`
- `/packages/eslint-config/react-native.js`
- `/packages/types/package.json`
- `/packages/types/index.ts`
- `/packages/utils/package.json`
- `/packages/utils/index.ts`

## Useful Post-Setup Commands

```bash
# Development
pnpm dev                    # Run all apps
pnpm web:dev               # Web only
pnpm mobile:dev            # Mobile only

# Build
pnpm build                 # Build everything
turbo run build --filter=web   # Web only

# Linting
pnpm lint                  # Lint all
pnpm format                # Format with Prettier

# Type-checking
pnpm type-check            # Type-check all

# Add dependencies
cd apps/web && pnpm add <package>       # Add to web
cd apps/mobile && pnpm add <package>    # Add to mobile
cd packages/types && pnpm add <package> # Add to package

# Vercel (web only)
cd apps/web
vercel dev                 # Local dev with Python
vercel deploy              # Deploy to Vercel
```

## Important Notes

1. **Python + Next.js in the same project**:
   - Python functions must be in `/api` (web project root)
   - Next.js API routes (if used) go in `/app/api`
   - Use `vercel dev` for development (not `next dev`)
   - **No Flask required!** Vercel Functions use `BaseHTTPRequestHandler` from Python's standard library
   - Example `/api/health.py`:
   ```python
   from http.server import BaseHTTPRequestHandler
   import json

   class handler(BaseHTTPRequestHandler):
       def do_GET(self):
           self.send_response(200)
           self.send_header('Content-type', 'application/json')
           self.end_headers()
           response = {'status': 'healthy', 'service': 'MomentoVino API'}
           self.wfile.write(json.dumps(response).encode())
           return
   ```

2. **pnpm Workspaces**:
   - Internal packages use `workspace:*` in package.json
   - Example: `"@momentovino/types": "workspace:*"`

3. **Turborepo Cache**:
   - Build outputs are cached automatically
   - `.turbo/` should be in `.gitignore`

4. **Mobile is independent**:
   - Does not deploy via Vercel
   - Uses EAS Build to generate binaries
   - Published to App Store/Play Store separately

5. **Separate Design Systems**:
   - Web: shadcn/ui (components in `/apps/web/components/ui`)
   - Mobile: React Native Reusables (components in `/apps/mobile/components/ui`)
   - Sharing only via `/packages/types` and `/packages/utils`

6. **Database (Supabase)**:
   - Configure in next phase
   - Connection via environment variables
   - Shared client via package (if needed)

## Vercel Deploy

### Vercel Project Configuration

Vercel deploy should point **only** to the `/apps/web` app, which contains both the Next.js frontend and Python Functions.

#### Steps for Vercel Project Setup:

1. **Create new project on Vercel**:
   - Connect MomentoVino GitHub repository
   - Framework Preset: **Next.js**
   - Root Directory: **`apps/web`** ⚠️ IMPORTANT

2. **Build & Development Settings**:
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: cd ../.. && pnpm turbo run build --filter=web
   Install Command: cd ../.. && pnpm install
   Output Directory: (leave default - .next)
   ```

3. **Environment Variables** (configure in Vercel Dashboard):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. **vercel.json file** already configured at `/apps/web/vercel.json`:
   - Defines Python 3.12 runtime for functions in `/api/**/*.py`
   - Configures build command for Turborepo
   - Optimizes deploy for monorepo

#### What will be deployed:

✅ **Included in Deploy:**
- `/apps/web/app/**` → Next.js Frontend
- `/apps/web/api/**` → Python Serverless Functions
- `/apps/web/public/**` → Static assets
- `/apps/web/components/**` → React components
- Dependencies from `/packages/*` used by web

❌ **NOT included in Deploy:**
- `/apps/mobile/**` → Stays local/CI only
- Other monorepo files not referenced

#### Turborepo + Vercel Integration

Turborepo has native Vercel integration that:
1. Automatically detects changes via `turbo-ignore`
2. Deploys only when `/apps/web` or its dependencies change
3. Caches builds remotely for faster CI/CD

#### Useful Vercel Commands:

```bash
# Local development (simulates Vercel environment)
cd apps/web
vercel dev

# Manual deploy (if needed)
cd apps/web
vercel deploy

# Production deploy
vercel deploy --prod

# View logs
vercel logs
```

#### URL Structure After Deploy:

```
https://momentovino.vercel.app              → Next.js Homepage
https://momentovino.vercel.app/wines        → Wines page
https://momentovino.vercel.app/api/health   → Python Function
https://momentovino.vercel.app/api/wines/list → Python Function
```

#### Post-Deploy Verification:

1. Test Next.js route: `https://[your-project].vercel.app`
2. Test Python API: `https://[your-project].vercel.app/api/health`
3. Check logs in Vercel Dashboard
4. Confirm only `/apps/web` was deployed (check build size)

#### Important About Monorepo on Vercel:

- ⚠️ Vercel deploys based on the configured **Root Directory** (`apps/web`)
- ⚠️ The `vercel.json` in `/apps/web` overrides global settings
- ⚠️ Build command uses Turborepo for cache optimization
- ⚠️ Mobile app (`/apps/mobile`) **never** goes to Vercel

## Next Steps After Implementation

1. Setup shadcn/ui in web app
2. Setup React Native Reusables in mobile app
3. Configure Supabase and create database schema
4. Implement authentication
5. Create first Python endpoints (CRUD wines/events)
6. Implement initial mobile screens
7. **Configure Vercel project following "Vercel Deploy" section**
