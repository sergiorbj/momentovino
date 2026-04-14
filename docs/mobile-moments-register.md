# Plan — Register a New Moment (Mobile + Supabase)

## Context
The mobile Moments tab already ships with a working globe and a placeholder "+ Register New Moment" button ([apps/mobile/app/(tabs)/moments.tsx:61](../apps/mobile/app/(tabs)/moments.tsx#L61)). The button is inert and no backend or data model exists. This plan wires the button to a real flow: a multi-step form that collects the fields, uploads photos, and persists everything to Supabase.

Findings from the exploration phase that drive key decisions:
- **No auth yet** in mobile ([apps/mobile/app/_layout.tsx](../apps/mobile/app/_layout.tsx) handles only fonts). Decision: use **Supabase anonymous auth** at app startup — creates a real `auth.users` row per device so RLS works, and the account can be upgraded to email/password later without data loss.
- **No Supabase client** in mobile, but env vars are already declared at [apps/mobile/.env.example](../apps/mobile/.env.example). Need to create the client and fill `.env`.
- **No `Moment` type** in `packages/types`. Must be added.
- **No form/image-picker libs** installed.
- **Empty `public` schema**, no migrations applied. `uuid-ossp` and `pgcrypto` extensions available; PostGIS not installed (we'll store lat/lng as two `double precision` columns — simpler and sufficient).
- **Wine type exists** at [packages/types/wine.ts](../packages/types/wine.ts) but no catalog/UI. Per user choice, a separate `wines` table + picker is in scope.
- **Photos:** up to 3 per moment, one flagged as cover, stored in Supabase Storage.

## Supabase Schema (created via `mcp__supabase__apply_migration`)

### Migration `0001_moments_core.sql`
```sql
-- Extensions already installed: uuid-ossp, pgcrypto
create extension if not exists pg_trgm;

create table public.wines (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  producer text,
  vintage int,
  region text,
  country text,
  type text check (type in ('RED','WHITE','ROSE','SPARKLING','DESSERT','FORTIFIED')),
  created_at timestamptz not null default now()
);
create index wines_created_by_idx on public.wines(created_by);
create index wines_name_trgm_idx on public.wines using gin (name gin_trgm_ops);

create table public.moments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_id uuid references public.wines(id) on delete set null,
  title text not null,
  description text,
  happened_at date not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  rating int check (rating between 1 and 5),
  cover_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index moments_user_id_idx on public.moments(user_id);
create index moments_happened_at_idx on public.moments(happened_at desc);

create table public.moment_photos (
  id uuid primary key default uuid_generate_v4(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  url text not null,
  position smallint not null check (position between 0 and 2),
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (moment_id, position)
);
create index moment_photos_moment_id_idx on public.moment_photos(moment_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger moments_set_updated_at before update on public.moments
  for each row execute function public.set_updated_at();
```

### Migration `0002_moments_rls.sql`
```sql
alter table public.moments       enable row level security;
alter table public.moment_photos enable row level security;
alter table public.wines         enable row level security;

create policy "moments_select_own" on public.moments
  for select using (auth.uid() = user_id);
create policy "moments_insert_own" on public.moments
  for insert with check (auth.uid() = user_id);
create policy "moments_update_own" on public.moments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "moments_delete_own" on public.moments
  for delete using (auth.uid() = user_id);

create policy "moment_photos_all_own" on public.moment_photos
  for all using (exists (
    select 1 from public.moments m where m.id = moment_id and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.moments m where m.id = moment_id and m.user_id = auth.uid()
  ));

create policy "wines_select_auth" on public.wines
  for select using (auth.role() = 'authenticated');
create policy "wines_insert_own"  on public.wines
  for insert with check (auth.uid() = created_by);
create policy "wines_update_own"  on public.wines
  for update using (auth.uid() = created_by);
```

### Migration `0003_moments_storage.sql`
```sql
insert into storage.buckets (id, name, public) values ('moment-photos', 'moment-photos', true);

create policy "moment_photos_read_public"  on storage.objects
  for select using (bucket_id = 'moment-photos');
create policy "moment_photos_upload_own"   on storage.objects
  for insert with check (bucket_id = 'moment-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "moment_photos_delete_own"   on storage.objects
  for delete using (bucket_id = 'moment-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```
Files stored at path `{user_id}/{moment_id}/{position}.jpg` so the RLS policy enforces ownership by folder.

## Mobile Implementation

### Dependencies to add (in `apps/mobile`)
- `@supabase/supabase-js`
- `@react-native-async-storage/async-storage` (Supabase session persistence)
- `expo-image-picker`
- `expo-file-system`
- `react-hook-form` + `zod` + `@hookform/resolvers`

### New files
```
apps/mobile/lib/
  supabase.ts                  # Supabase client (EXPO_PUBLIC_* envs + AsyncStorage)
  session.ts                   # ensureAnonymousSession() helper
  database.types.ts            # generated via mcp__supabase__generate_typescript_types

apps/mobile/features/moments/
  schema.ts                    # zod schema for the form
  api.ts                       # createMoment(), uploadMomentPhoto(), searchWines(), createWine()
  hooks.ts                     # useCreateMoment(), useWineSearch()

apps/mobile/app/(tabs)/moments/
  new.tsx                      # Register form
  wine-picker.tsx              # Modal route to search/create a wine
```
If `moments.tsx` is still flat at implementation time, convert it to a folder with `index.tsx` in the same change.

### Form fields (zod schema)
```ts
z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  happenedAt: z.date(),
  location: z.object({
    name: z.string().min(2),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  wineId: z.string().uuid(),           // picked/created via wine-picker route
  rating: z.number().int().min(1).max(5).optional(),
  photos: z.array(z.object({
    uri: z.string(),
    isCover: z.boolean(),
  })).min(1).max(3),
})
```

### UI flow
1. Tap **"+ Register New Moment"** → `router.push('/moments/new')`.
2. Screen `new.tsx`:
   - Section 1: title, description, happenedAt (date picker).
   - Section 2: location — manual fields (name + lat/lng). Future: map picker.
   - Section 3: wine — "Select wine" button opens `wine-picker` modal; selected wine shown as a chip.
   - Section 4: photos — up to 3 slots; first selected defaults to cover; cover toggle per slot.
   - Section 5: rating (1–5 stars, optional).
   - Sticky "Save moment" button.
3. Modal `wine-picker.tsx`: debounced search against `wines` by name, list of results, "Create new wine" CTA opens inline form (name/producer/vintage/region/type), inserts and returns the new wine.

### Submit flow (`createMoment`)
1. Insert row into `moments` with everything except photos → get `id`.
2. For each photo: read URI with `expo-file-system`, upload to `moment-photos/{user_id}/{moment_id}/{position}.jpg`, get public URL, insert into `moment_photos`.
3. Update `moments.cover_photo_url` with the cover photo's URL.
4. On success: `router.back()` and invalidate any moments list query.
5. On error: surface via toast/alert; keep form populated for retry.

### Anonymous auth bootstrap
In [apps/mobile/app/_layout.tsx](../apps/mobile/app/_layout.tsx), after fonts load:
```ts
const { data } = await supabase.auth.getSession()
if (!data.session) await supabase.auth.signInAnonymously()
```
Gate app render until session exists so every call has `auth.uid()`.

## Critical files to modify/create
- [apps/mobile/app/(tabs)/moments.tsx](../apps/mobile/app/(tabs)/moments.tsx) — wire the CTA `onPress`.
- [apps/mobile/app/_layout.tsx](../apps/mobile/app/_layout.tsx) — bootstrap anon session.
- [apps/mobile/lib/supabase.ts](../apps/mobile/lib/supabase.ts) — new client.
- [apps/mobile/.env](../apps/mobile/.env) — fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [apps/mobile/package.json](../apps/mobile/package.json) — new deps.
- [packages/types/moment.ts](../packages/types/moment.ts) — new type; export from [packages/types/index.ts](../packages/types/index.ts).

## Implementation order
1. Apply Supabase migrations via `mcp__supabase__apply_migration` (0001, 0002, 0003).
2. Generate TS types: `mcp__supabase__generate_typescript_types` → `apps/mobile/lib/database.types.ts`.
3. Add deps + Supabase client + anon session bootstrap.
4. Create the form, wine-picker, and API helpers.
5. Wire the CTA.
6. End-to-end manual test.

## Verification
- `pnpm --filter mobile type-check` passes.
- `mcp__supabase__list_tables` shows `moments`, `moment_photos`, `wines` in `public`.
- On device (dev build):
  - Cold start creates an anonymous session (visible in `auth.users` via MCP).
  - Tapping "+ Register New Moment" opens the form.
  - Completing required fields and submitting returns to the Moments screen.
  - New row present in `moments`; photos visible under `moment-photos/{user_id}/{moment_id}/`.
  - Second anonymous session cannot read the first user's moments (RLS working).
- `mcp__supabase__get_advisors` reports no critical issues on the new schema.
