-- Ensure RLS is enabled (idempotent)
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

-- ORGANIZATIONS
-- Allow authenticated users to insert new organizations (for create-org flow)
drop policy if exists "org_insert_authenticated" on public.organizations;
create policy "org_insert_authenticated"
on public.organizations
for insert
to authenticated
with check (true);

-- Keep SELECT restricted (should already exist in prior migration); do not open UPDATE/DELETE here.

-- PROFILES
-- User can read own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

-- User can update own profile (needed to set org_id + role)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- User can insert own profile (needed if profile row does not exist yet and we use upsert)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());
