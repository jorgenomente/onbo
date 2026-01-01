-- Allow org admins/trainers to read all profiles in their org.
drop policy if exists "profiles_select_org_admin" on public.profiles;
create policy "profiles_select_org_admin"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = profiles.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
