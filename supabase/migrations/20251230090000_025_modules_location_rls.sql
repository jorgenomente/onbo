-- Update modules RLS policies to support groups/locations while keeping legacy org-based access.

drop policy if exists "modules_select_org" on public.modules;
drop policy if exists "modules_write_admin_trainer" on public.modules;
drop policy if exists "modules_update_admin_trainer" on public.modules;
drop policy if exists "modules_delete_admin_trainer" on public.modules;

create policy "modules_select_tenancy"
on public.modules
for select
to authenticated
using (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "modules_insert_tenancy"
on public.modules
for insert
to authenticated
with check (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "modules_update_tenancy"
on public.modules
for update
to authenticated
using (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
)
with check (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "modules_delete_tenancy"
on public.modules
for delete
to authenticated
using (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);
