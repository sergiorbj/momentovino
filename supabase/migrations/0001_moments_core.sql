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
