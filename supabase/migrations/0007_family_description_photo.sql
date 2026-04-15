-- Optional family description (max 80 chars) and cover image URL + public storage bucket.

alter table public.families add column if not exists description text;
alter table public.families add column if not exists photo_url text;

alter table public.families drop constraint if exists families_description_len;
alter table public.families add constraint families_description_len check (description is null or char_length(description) <= 80);

insert into storage.buckets (id, name, public)
values ('family-covers', 'family-covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "family_covers_select_public" on storage.objects;
create policy "family_covers_select_public" on storage.objects
  for select using (bucket_id = 'family-covers');

drop policy if exists "family_covers_insert_own" on storage.objects;
create policy "family_covers_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'family-covers' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "family_covers_update_own" on storage.objects;
create policy "family_covers_update_own" on storage.objects
  for update using (
    bucket_id = 'family-covers' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "family_covers_delete_own" on storage.objects;
create policy "family_covers_delete_own" on storage.objects
  for delete using (
    bucket_id = 'family-covers' and auth.uid()::text = (storage.foldername(name))[1]
  );
