-- Evaluate auth.uid() once per statement in organizations select policy.
drop policy if exists "organizations_select_member_or_creator" on public.organizations;
create policy "organizations_select_member_or_creator"
on public.organizations
for select
to authenticated
using (
  (created_by = (select auth.uid()))
  or
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = organizations.id
  )
);
