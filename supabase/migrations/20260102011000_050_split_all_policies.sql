-- Split FOR ALL policies into INSERT/UPDATE/DELETE to avoid SELECT overlap.
-- Generated from latest policy definitions in supabase/migrations.

drop policy if exists "group_memberships_mutate_admin" on public.group_memberships;
drop policy if exists "group_memberships_mutate_admin_insert" on public.group_memberships;
create policy "group_memberships_mutate_admin_insert"
on public.group_memberships
for insert
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "group_memberships_mutate_admin_update" on public.group_memberships;
create policy "group_memberships_mutate_admin_update"
on public.group_memberships
for update
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "group_memberships_mutate_admin_delete" on public.group_memberships;
create policy "group_memberships_mutate_admin_delete"
on public.group_memberships
for delete
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);

drop policy if exists "groups_mutate_admin" on public.groups;
drop policy if exists "groups_mutate_admin_insert" on public.groups;
create policy "groups_mutate_admin_insert"
on public.groups
for insert
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "groups_mutate_admin_update" on public.groups;
create policy "groups_mutate_admin_update"
on public.groups
for update
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "groups_mutate_admin_delete" on public.groups;
create policy "groups_mutate_admin_delete"
on public.groups
for delete
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);

drop policy if exists "location_memberships_mutate_admin" on public.location_memberships;
drop policy if exists "location_memberships_mutate_admin_insert" on public.location_memberships;
create policy "location_memberships_mutate_admin_insert"
on public.location_memberships
for insert
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "location_memberships_mutate_admin_update" on public.location_memberships;
create policy "location_memberships_mutate_admin_update"
on public.location_memberships
for update
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "location_memberships_mutate_admin_delete" on public.location_memberships;
create policy "location_memberships_mutate_admin_delete"
on public.location_memberships
for delete
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);

drop policy if exists "locations_mutate_admin" on public.locations;
drop policy if exists "locations_mutate_admin_insert" on public.locations;
create policy "locations_mutate_admin_insert"
on public.locations
for insert
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "locations_mutate_admin_update" on public.locations;
create policy "locations_mutate_admin_update"
on public.locations
for update
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
drop policy if exists "locations_mutate_admin_delete" on public.locations;
create policy "locations_mutate_admin_delete"
on public.locations
for delete
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
);
