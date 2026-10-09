# Mobile Moments: data, create/edit, list and detail

A **moment** is the core object of the app: a titled memory with a date, a place, 1 to 8 wines, up to 3 photos and an optional rating. This doc covers the data model and the screens under `app/moments/`. The globe on the Moments tab is in [mobile-moments-screen.md](./mobile-moments-screen.md).

## Data model

| Table | Notes |
|---|---|
| `moments` | `user_id`, `title`, `description`, `happened_at` (date), `location_name`, `latitude`, `longitude`, `rating`, `cover_photo_url`. RLS: owner only (`0001`, `0002`). |
| `moment_wines` | Junction `moment_id` × `wine_id` with `position` (`0014`). Replaced the old `moments.wine_id` column. Cascades on moment delete. |
| `moment_photos` | `moment_id`, `url`, `position` (0 to 2), `is_cover`. Files live in the `moment-photos` bucket under `{userId}/{momentId}/` (`0003`, `0011`). |
| `wines` | One row per bottle (`created_by`). Picking an existing wine **clones** the row (`cloneWineForReuse`), so every moment holds its own bottle and the cellar count grows. |

Deleting a moment removes its storage folder, the row (junction cascades), and any wine left with no other moment (`deleteMoment`).

## Form schema

`features/moments/schema.ts` → `momentFormSchema`:

| Field | Rule |
|---|---|
| `title` | 2 to 80 chars |
| `description` | optional, max 500 |
| `happenedAt` | required ISO string |
| `locationName`, `latitude`, `longitude` | required, flat fields |
| `wineIds` | 1 to 8 uuids |
| `rating` | optional int 1 to 5 |
| `photos` | 0 to 3, one flagged `isCover` |

Validation messages are i18n keys (`moments.validation.*`), translated when rendered.

## Routes

```
app/moments/
├── _layout.tsx        Stack
├── list.tsx           all moments, newest first
├── [id].tsx           detail
├── [id]/edit.tsx      edit form
├── new.tsx            create form
└── wine-picker.tsx    pick from cellar or scan a new bottle
```

## Create and edit

- **Location** is prefilled from GPS (`use-current-location.ts` → `reverseGeocode`) and searchable via Nominatim (`location-api.ts`), with `accept-language` set to the app language. When the search is empty, a localized list of popular cities is shown.
- **Wines** come from `wine-picker.tsx`. It lists cellar wines (grouped by `features/wines/similarity.ts`) and a "scan to add" button that opens `/(tabs)/scanner?forMoment=1` (or `editMomentId=<id>`). The picker and scanner result queue picks with `setPendingWinePick` (`wine-picker-handoff.ts`), and the form drains the queue in `useFocusEffect`.
- **Drafts:** `moment-draft.ts` keeps module-level drafts for new and edit, so detours to the picker or scanner don't lose input. They are cleared on close or submit.
- On save, `new.tsx` calls `router.replace('/(tabs)/moments')`; `edit.tsx` goes back.

## List and detail

- The globe on the Moments tab animates (scale 2.5, fade) then pushes `/moments/list`. The animation resets on focus.
- `list.tsx`: `FlatList` with pull to refresh, sorted by `happened_at desc, created_at desc`. Each card shows the cover thumbnail, title, location, date, the first wine plus a `+N` chip, and the rating. The empty state has a CTA to `/moments/new`.
- `[id].tsx`: cover photo (or a wine-colored placeholder), title, date, location, description, every linked wine, rating, and a photo strip. The header has edit (`/moments/{id}/edit`) and delete (confirmation `Alert`).

## Data layer

`features/moments/api.ts` wraps Supabase; screens use `features/moments/hooks.ts` (React Query):

| Hook | Wraps |
|---|---|
| `useMoments` | `fetchMoments` → `MomentWithWines[]` (`wines: {id, name}[]`) |
| `useMomentDetail(id)` | `fetchMomentDetail` → `{ moment, wines, photos }` |
| `useMomentStats` | `fetchMomentStats` (moments, countries, wines) |
| `useCreateMoment`, `useUpdateMoment(id)`, `useDeleteMoment(id)` | mutations; invalidate via `invalidateMomentSurfaces` |
| `useWineSearch`, `useCreateWine` | picker helpers |

`refresh` on list hooks calls `invalidateQueries`. Keys live in `lib/query-keys.ts`. All UI copy goes through `t()` (`moments.*`).
