# Mobile Moments — List and Detail Screens

## Overview

When the user taps the 3D globe on the Moments tab, the globe plays an expansion animation (scale up + fade out) and transitions to a full list of registered moments. Tapping a moment in the list opens a detail screen with all information, photos, and wine data.

## Navigation Flow

```
Globe Screen  ──tap globe──▶  Moments List  ──tap item──▶  Moment Detail
                              (sorted by date)              (full info + photos)
```

All three routes live under `app/moments/` as a stack group with a shared `_layout.tsx`.

## Globe Expansion Animation

Implemented in `app/(tabs)/moments.tsx` using `react-native-reanimated`:

1. The `globeWrapper` is wrapped in `Animated.View` with shared values for `scale` and `opacity`.
2. On globe press:
   - `scale` animates from 1 to 2.5 (timing, 350ms, ease-out)
   - `opacity` animates from 1 to 0 (timing, 350ms)
3. After animation completes, `router.push('/moments/list')` fires.
4. When the screen regains focus (user navigates back), scale and opacity reset to their initial values.

## Route Structure

```
app/moments/
├── _layout.tsx         # Stack navigator for the group
├── list.tsx            # Moments list screen
├── [id].tsx            # Moment detail screen (dynamic route)
├── new.tsx             # (existing) Create moment form
└── wine-picker.tsx     # (existing) Wine search/create modal
```

## API Functions

Added to `features/moments/api.ts`:

### `fetchMoments()`

```sql
SELECT moments.*, wines.name AS wine_name
FROM moments
LEFT JOIN wines ON moments.wine_id = wines.id
WHERE moments.user_id = auth.uid()
ORDER BY moments.happened_at DESC
```

Returns `MomentWithWine[]` — the moment row plus an optional `wine_name` string.

### `fetchMomentDetail(id: string)`

```sql
SELECT moments.*, wines.*, moment_photos.*
FROM moments
LEFT JOIN wines ON moments.wine_id = wines.id
WHERE moments.id = :id

SELECT * FROM moment_photos WHERE moment_id = :id ORDER BY position
```

Two queries (Supabase does not support nested selects across different tables easily). Returns `{ moment, wine, photos }`.

## React Hooks

Added to `features/moments/hooks.ts`:

### `useMoments()`

- Calls `fetchMoments()` on mount
- Returns `{ moments, loading, error, refresh }`
- `refresh()` re-fetches (used by pull-to-refresh `RefreshControl`)

### `useMomentDetail(id)`

- Calls `fetchMomentDetail(id)` on mount
- Returns `{ moment, wine, photos, loading }`

## List Screen (`list.tsx`)

### Layout

```
┌─────────────────────────┐
│  ←  My Moments          │  Header with back arrow
├─────────────────────────┤
│ ┌─────┬───────────────┐ │
│ │photo│ Title          │ │  Moment card
│ │ 72² │ Location · Date│ │  - Cover photo thumbnail (left)
│ │     │ 🍷 Wine name  │ │  - Title (DM Sans 600)
│ │     │ ★★★★☆         │ │  - Location + date (muted)
│ └─────┴───────────────┘ │  - Wine chip + rating
│ ┌─────┬───────────────┐ │
│ │photo│ Title          │ │  ... more cards
│ │     │ Location · Date│ │
│ └─────┴───────────────┘ │
└─────────────────────────┘
```

### Behavior

- `FlatList` with `RefreshControl` for pull-to-refresh
- Empty state: text + "Register your first moment" button
- Cards are `TouchableOpacity` -> `router.push(\`/moments/\${id}\`)`
- Sorted by `happened_at` descending (most recent first)

## Detail Screen (`[id].tsx`)

### Layout

```
┌─────────────────────────┐
│ ←  (overlay on photo)   │
│                         │
│   [  Cover Photo  ]     │  Full-width cover image
│                         │
├─────────────────────────┤
│                         │
│  Title                  │  DM Serif Display, 24px
│  📅 Apr 13, 2026        │  Date with icon
│  📍 Mendoza, Argentina  │  Location with icon
│                         │
│  Description text here  │  Body text
│                         │
│  ┌─ Wine ─────────────┐ │
│  │ Malbec Reserva     │ │  Wine card section
│  │ Catena · 2019      │ │
│  │ Mendoza · RED      │ │
│  └────────────────────┘ │
│                         │
│  ★★★★☆ (4/5)           │  Rating display
│                         │
│  [img1] [img2] [img3]  │  Horizontal photo scroll
│                         │
└─────────────────────────┘
```

### Behavior

- Back button overlaid on the cover photo (semi-transparent circle)
- If no cover photo, show a wine-colored gradient placeholder
- Wine section only visible if `wine_id` is not null
- Photos in a horizontal `ScrollView`
- Rating only visible if set

## Design Tokens

| Element | Token | Value |
|---------|-------|-------|
| Screen background | custom | `#F5EBE0` |
| Titles | DM Serif Display 400 | `#722F37` |
| Card backgrounds | white | `#FFFFFF` |
| Body text | DM Sans 400 | `#3F2A2E` |
| Labels / muted | DM Sans 400 | `#C2703E` |
| Star / accent | primary.500 | `#722F37` |
| Back button bg | semi-transparent | `rgba(255,255,255,0.85)` |

## Files Changed

### New
- `apps/mobile/app/moments/_layout.tsx`
- `apps/mobile/app/moments/list.tsx`
- `apps/mobile/app/moments/[id].tsx`

### Modified
- `apps/mobile/features/moments/api.ts` — add `fetchMoments()`, `fetchMomentDetail()`
- `apps/mobile/features/moments/hooks.ts` — add `useMoments()`, `useMomentDetail()`
- `apps/mobile/app/(tabs)/moments.tsx` — Reanimated globe animation + navigation
