# Mobile Scanner: wine label recognition

The scanner is the **only way to add a wine**. The user points the camera at a label (or picks a gallery photo), Gemini identifies the wine, and the result screen saves it to the cellar, to a moment, or to a brand new moment.

## Flow

```
(tabs)/scanner.tsx ──capture/gallery──▶ prepareImageForWineScan ──▶ POST /api/scan-wine
        │                                                              │
        │                                         ScanResult (or error code)
        ▼                                                              ▼
scanner/result.tsx ──save──▶ POST /api/wines ──▶ attachWineLabelPhoto (wine-labels bucket)
        │
        ├─ "Add to my wines"     → router.replace('/(tabs)/wines')
        ├─ "Create a moment"     → router.replace('/moments/new', { wineId, wineName })
        └─ forMoment / editMomentId mode
             "Add to moment"     → setPendingWinePick → router.dismissTo('/moments/new' | '/moments/[id]/edit')
```

- **Capture:** `expo-camera` `CameraView` or `expo-image-picker` gallery.
- **Downscale:** `prepare-image-for-scan.ts` resizes to a 1600px long edge at JPEG 0.72, so the base64 body stays under Vercel's ~4.5MB limit.
- **Label photo handoff:** `pending-label-photo.ts` holds the local image between the scanner and result screens; after the wine is created it is uploaded to the `wine-labels` bucket (`attachWineLabelPhoto`, migration `0004`).
- **Moment mode:** the moment form and wine picker open the scanner with `?forMoment=1` (or `editMomentId=<id>`). The result then queues the pick via `wine-picker-handoff.ts` instead of leaving the moment flow.
- After a save, the result screen invalidates `['wines']`, `winesCount`, `profile`, `momentStats` and `family`.

## API

Both endpoints are Python Vercel functions in `apps/web/api/` (run locally with `pnpm dev:web:with-flask`). Auth is the Supabase access token in `Authorization: Bearer`, verified in `_api_common.py` (401 `session_expired`).

### `POST /api/scan-wine` (`scan-wine.py`)

Request: `{ image: <base64>, mimeType, language }`.

- Calls Gemini (`gemini-3.1-flash-lite:generateContent`) over REST with `GEMINI_API_KEY`.
- The prompt is per language: `api/prompts/scan-wine-label.{en,pt-BR,pt-PT,es,it}.json`, falling back to `en`. The description comes back in the user's language.
- Response (`features/scanner/types.ts` → `ScanResult`): `name`, `producer`, `region`, `country`, `type` (`RED | WHITE | ROSE | SPARKLING | DESSERT | FORTIFIED`), `description`. **No vintage**: the prompt tells the model to leave it out.
- Errors: `not_identified` (no wine found in the image), `scan_failed` (Gemini or parse failure).

### `/api/wines` (`wines.py`)

| Method | Behavior |
|---|---|
| `GET` | The user's wines, newest first |
| `POST` | Creates a wine. If `_wine_match.find_matching_wine` finds the same bottle, returns it with `reusedExisting: true`. 400 `wine_name_required` |
| `DELETE` | Deletes a list of the user's wines. 404 `wines_not_found` |

## Client

- `features/scanner/api.ts`: `scanWineImage` (called directly from the screen as a non-cached one-shot), `createWineViaApi`, `attachWineLabelPhoto`.
- `features/scanner/hooks.ts`: `useCreateWineViaApi`.
- Non-2xx responses throw `ApiError` (`lib/api-error.ts`). Screens show `translateApiError(err, t, fallbackKey)`, which maps `code` to `errors.server.<code>`, so English server messages never reach the UI.

## Onboarding variant

`app/onboarding/scanner-onb.tsx` and `scan-result-onb.tsx` reuse `scanWineImage` but don't persist anything: the result is held in `features/onboarding/onboarding-capture.ts` and written after auth by `finalize-account.ts`. See [../onboarding/mobile-onboarding.md](../onboarding/mobile-onboarding.md).
