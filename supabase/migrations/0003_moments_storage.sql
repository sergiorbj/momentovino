insert into storage.buckets (id, name, public) values ('moment-photos', 'moment-photos', true);

create policy "moment_photos_read_public"  on storage.objects
  for select using (bucket_id = 'moment-photos');
create policy "moment_photos_upload_own"   on storage.objects
  for insert with check (bucket_id = 'moment-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "moment_photos_delete_own"   on storage.objects
  for delete using (bucket_id = 'moment-photos' and auth.uid()::text = (storage.foldername(name))[1]);
