drop policy if exists "profiles_select_org_admin" on public.profiles;

create or replace function public.current_org_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select org_id from public.profiles where user_id = auth.uid() limit 1
$$;

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1
$$;

create policy "profiles_select_org_admin"
on public.profiles
for select
to authenticated
using (
  org_id = public.current_org_id()
  and public.current_role() in ('org_admin', 'trainer')
);
