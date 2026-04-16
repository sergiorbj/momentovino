-- Allow authenticated users to delete only their own wine rows (cellar / duplicates).
create policy "wines_delete_own" on public.wines
  for delete using (auth.uid() = created_by);
