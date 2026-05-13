-- Multi-wine moments: a moment can reference 1..N wines.
--
-- Before this migration `moments.wine_id` was a single FK on `moments`. The
-- new junction `moment_wines` carries the relationship; the column on
-- `moments` is backfilled into the junction and then dropped so all reads/
-- writes have to go through the new shape.
--
-- Both FKs cascade on delete:
--   * deleting a moment removes its junction rows (parent gone).
--   * deleting a wine row removes it from every moment that referenced it
--     (acceptable under the clone-on-pick semantics — each wine row is
--     owned by exactly one moment in practice today).

create table public.moment_wines (
  moment_id  uuid        not null references public.moments(id) on delete cascade,
  wine_id    uuid        not null references public.wines(id)   on delete cascade,
  position   int         not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (moment_id, wine_id)
);

create unique index moment_wines_moment_position_uq
  on public.moment_wines (moment_id, position);
create index moment_wines_wine_idx on public.moment_wines (wine_id);

alter table public.moment_wines enable row level security;

-- Mirrors `moment_photos_all_own` from 0002_moments_rls.sql — the parent
-- moment's `user_id` is the source of truth for ownership.
create policy "moment_wines_all_own" on public.moment_wines
  for all using (exists (
    select 1 from public.moments m where m.id = moment_id and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.moments m where m.id = moment_id and m.user_id = auth.uid()
  ));

-- Backfill: every existing moment with a wine becomes one junction row at
-- position 0.
insert into public.moment_wines (moment_id, wine_id, position)
select id, wine_id, 0 from public.moments where wine_id is not null;

alter table public.moments drop column wine_id;
