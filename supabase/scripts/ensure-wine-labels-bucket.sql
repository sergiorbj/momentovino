-- Run once in Supabase Dashboard → SQL Editor (fixes "Bucket not found" on label upload).
-- Safe to re-run.

alter table public.wines add column if not exists label_photo_url text;

insert into storage.buckets (id, name, public)
values ('wine-labels', 'wine-labels', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "wine_labels_read_public" on storage.objects;
drop policy if exists "wine_labels_upload_own" on storage.objects;
drop policy if exists "wine_labels_update_own" on storage.objects;
drop policy if exists "wine_labels_delete_own" on storage.objects;

create policy "wine_labels_read_public" on storage.objects
  for select using (bucket_id = 'wine-labels');

create policy "wine_labels_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'wine-labels'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "wine_labels_update_own" on storage.objects
  for update using (
    bucket_id = 'wine-labels'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "wine_labels_delete_own" on storage.objects
  for delete using (
    bucket_id = 'wine-labels'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
