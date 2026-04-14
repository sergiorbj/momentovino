# Mobile Scanner — Wine Label Recognition

## Overview

The Scanner tab is built around **live camera capture**: when the user opens the tab, the back camera preview fills the screen with a wine-colored frame (viewfinder) so they can align the label before shooting. A single **shutter** control captures the photo; **Gallery** is a secondary option for choosing an existing photo. The image is sent to a Next.js API route that uses **Google Gemini 2.5 Flash** to identify the wine and extract structured metadata. The result is displayed on a dedicated screen with two actions: save the wine to the user's collection, or save it and immediately create a moment with that wine pre-selected.

## Architecture

```
Mobile Scanner Tab
  ├── Live preview (expo-camera CameraView, back camera)
  ├── Viewfinder overlay (dimmed edges + framed region, same aspect as preview card)
  ├── Shutter → takePictureAsync → local URI
  └── Gallery (expo-image-picker launchImageLibraryAsync only)
        │
        ▼
  Photo Preview → "Scan this wine" button
        │
        ▼  POST /api/scan-wine { image (base64), mimeType }
        │
  Next.js API Route (apps/web/app/api/scan-wine/route.ts)
        │
        ▼  Gemini 2.5 Flash vision analysis
        │
  JSON response → { name, producer, vintage, region, country, type, description }
        │
        ▼
  Result Screen (apps/mobile/app/scanner/result.tsx)
        ├── "Add to my wines" → POST /api/wines → back to scanner
        └── "Add wine + create moment" → POST /api/wines → /moments/new?wineId=...
```

## Backend — Next.js API Routes

All routes live under `apps/web/app/api/` as Next.js Route Handlers.

### Authentication

Every request from the mobile app includes the Supabase access token in the `Authorization: Bearer <token>` header. The backend verifies this token using the Supabase service role client to extract the authenticated user ID.

Helper: `apps/web/lib/auth.ts`

### Supabase Admin Client

`apps/web/lib/supabase-admin.ts` — Server-side client using `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS for admin operations while still scoping queries to the authenticated user.

### Gemini Client

`apps/web/lib/gemini.ts` — Initializes `@google/genai` with `GEMINI_API_KEY`.

### POST /api/scan-wine

- **Input**: `{ image: string (base64), mimeType: "image/jpeg" | "image/png" }`
- **Process**: Sends image to Gemini 2.5 Flash with a structured prompt requesting wine metadata as JSON
- **Output**: `{ name, producer, vintage, region, country, type, description }` or `{ error: string }`
- Uses `responseMimeType: "application/json"` for reliable structured output

### GET /api/wines

- **Query**: All wines belonging to the authenticated user, ordered by name
- **Output**: `WineRow[]`

### POST /api/wines

- **Input**: `{ name, producer?, vintage?, region?, country?, type? }`
- **Process**: Insert into `wines` table with `created_by = authenticated user id`
- **Output**: Created `WineRow`

## Mobile — Scanner Flow

### Scanner Tab (`app/(tabs)/scanner.tsx`)

Dark-themed, camera-first flow:

1. **Tab focused (camera allowed)**: Full-screen `CameraView` with `active` tied to screen focus (pauses when leaving the tab). Dimmed mask outside the frame; rounded frame border (`#722F37`) matching the previous preview aspect ratio (~0.75). Header copy explains aligning the label.
2. **Capture**: Large circular shutter; `takePictureAsync` after `onCameraReady`. Secondary **Gallery** control (icon + label) opens the image library only if the user prefers an existing photo.
3. **Permission not granted**: Short explanation + **Allow camera**; optional **Choose from gallery instead** for users who decline camera.
4. **After capture or gallery pick**: Same preview card as before + **Scan this wine** CTA.
5. **Scanning**: Semi-transparent overlay with spinner + "Identifying wine..."
6. **Success**: Navigate to `scanner/result` with params.
7. **Error**: Alert with message; user can retake or clear preview.

### Result Screen (`app/scanner/result.tsx`)

Light-themed card layout (matches the app's beige `#F5EBE0` background):

- Wine icon header
- Wine name (DM Serif Display, large)
- Metadata fields: producer, vintage, region, country, type (as labeled rows)
- AI description/tasting note (italic, muted color)
- Two action buttons:
  - "Add to my wines" — creates wine, shows success toast, navigates back
  - "Add wine + create moment" — creates wine, navigates to `/moments/new` with `wineId` and `wineName` params

### Feature Layer

- `features/scanner/types.ts` — `ScanResult` and `ScanWineRequest` interfaces
- `features/scanner/api.ts` — `scanWineImage()` and `createWineViaApi()` functions; both attach the Supabase session token to requests

## Environment Variables

### apps/web/.env

```
GEMINI_API_KEY=your-gemini-api-key           # Google AI Studio key
SUPABASE_SERVICE_ROLE_KEY=your-service-key   # (already exists)
NEXT_PUBLIC_SUPABASE_URL=...                 # (already exists)
```

### apps/mobile/.env

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api  # (already exists, points to Next.js)
```

## Dependencies

### apps/web (new)
- `@google/genai` — Google Gemini TypeScript SDK
- `@supabase/supabase-js` — Supabase client (server-side)

### apps/mobile
- `expo-camera` — live preview and `takePictureAsync` for the primary capture path
- `expo-image-picker` — gallery pick only (and legacy-style flows if needed)

## File Structure

```
apps/web/
├── lib/
│   ├── auth.ts                  # JWT verification helper
│   ├── supabase-admin.ts        # Server-side Supabase client
│   └── gemini.ts                # Gemini AI client
└── app/api/
    ├── scan-wine/route.ts       # POST: image → Gemini → wine info
    └── wines/route.ts           # GET: list wines, POST: create wine

apps/mobile/
├── app.json                     # `expo-camera` config plugin (camera permission copy)
├── app/
│   ├── (tabs)/scanner.tsx       # Live CameraView + viewfinder; gallery secondary; scan flow
│   └── scanner/
│       ├── _layout.tsx          # Stack navigator
│       └── result.tsx           # AI result display + actions
└── features/scanner/
    ├── types.ts                 # ScanResult interface
    └── api.ts                   # API calls (scan + create wine)
```

## Design Tokens

| Element | Value |
|---------|-------|
| Scanner background | `#1C1510` (dark) |
| Result background | `#F5EBE0` (beige) |
| Primary accent | `#722F37` (wine) |
| Card background | `#FFFFFF` |
| Title font | DM Serif Display 400 |
| Body font | DM Sans 400/600 |
| CTA buttons | `#722F37` bg, white text |
