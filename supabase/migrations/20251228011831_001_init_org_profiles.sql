-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  role text not null default 'employee' check (role in ('org_admin', 'trainer', 'employee', 'platform_owner')),
  full_name text null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles(org_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

-- Profiles policies
create policy "profiles_select_own"
on public.profiles
for select
using (user_id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
with check (user_id = auth.uid());

-- Organizations policies
create policy "organizations_select_member"
on public.organizations
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organizations.id
  )
);

create policy "organizations_insert_authenticated"
on public.organizations
for insert
with check (auth.uid() is not null);
