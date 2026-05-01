-- ============================================================
-- 0011_moment_photos_storage_update.sql
-- Uploads may use upsert in the client; Storage maps upsert to INSERT .. ON CONFLICT
-- which requires an UPDATE policy on storage.objects (same pattern as wine-labels).
-- ============================================================

drop policy if exists "moment_photos_update_own" on storage.objects;

create policy "moment_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'moment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'moment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
