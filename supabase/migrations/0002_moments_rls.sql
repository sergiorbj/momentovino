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
