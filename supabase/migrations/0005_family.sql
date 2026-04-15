-- Family groups: one owned family per user (owner_id unique), members, email invitations.

create table public.families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create index families_owner_id_idx on public.families(owner_id);

create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create index family_members_family_id_idx on public.family_members(family_id);
create index family_members_user_id_idx on public.family_members(user_id);

create table public.family_invitations (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

create index family_invitations_family_id_idx on public.family_invitations(family_id);
create index family_invitations_token_idx on public.family_invitations(token) where status = 'pending';

create trigger families_set_updated_at before update on public.families
  for each row execute function public.set_updated_at();

-- Service role only: resolve auth user by email for invite/add-member (Python API).
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(trim(lookup_email)) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- RLS
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;

-- families: read if owner or member
create policy "families_select_member_or_owner" on public.families
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = families.id and fm.user_id = auth.uid()
    )
  );

create policy "families_insert_owner" on public.families
  for insert with check (owner_id = auth.uid());

create policy "families_update_owner" on public.families
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- family_members: read if same family membership
create policy "family_members_select_same_family" on public.family_members
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_members.family_id and fm.user_id = auth.uid()
    )
  );

-- insert: family owner, or existing admin of that family
create policy "family_members_insert_owner_or_admin" on public.family_members
  for insert with check (
    exists (
      select 1 from public.families f
      where f.id = family_id and f.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = family_members.family_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );

-- invitations: read/insert for family admins (including owner via membership)
create policy "family_invitations_select_admin" on public.family_invitations
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_invitations.family_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );

create policy "family_invitations_insert_admin" on public.family_invitations
  for insert with check (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_invitations.family_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );

create policy "family_invitations_update_admin" on public.family_invitations
  for update using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_invitations.family_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );
