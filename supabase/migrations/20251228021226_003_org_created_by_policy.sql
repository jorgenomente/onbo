-- 1) Column
alter table public.organizations
add column if not exists created_by uuid;

-- default auth.uid()
alter table public.organizations
alter column created_by set default auth.uid();

-- 2) Insert policy: authenticated, with_check created_by = auth.uid()
drop policy if exists "org_insert_authenticated" on public.organizations;
create policy "org_insert_authenticated"
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

-- (Optional) remove old insert policy if present
drop policy if exists "organizations_insert_authenticated" on public.organizations;

-- 3) Select policy: member OR creator
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member_or_creator"
on public.organizations
for select
to authenticated
using (
  (created_by = auth.uid())
  OR
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organizations.id
  )
);
