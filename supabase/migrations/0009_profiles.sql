-- ============================================================
-- 0009_profiles.sql — User profiles & preferences
-- ============================================================

-- 1. Table
create table public.profiles (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  display_name          text        not null default '',
  bio                   text                 default null,
  avatar_url            text                 default null,
  language              text        not null default 'en'
                                    check (language in ('en', 'pt-BR')),
  notifications_enabled boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is 'User profile data and preferences';

-- 2. Auto-update updated_at
create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- 3. Auto-create profile on new auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Service role full access"
  on public.profiles for all
  using ((select auth.role()) = 'service_role');

-- 5. Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
