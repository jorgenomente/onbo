alter table public.groups enable row level security;
alter table public.locations enable row level security;
alter table public.group_memberships enable row level security;
alter table public.location_memberships enable row level security;

create policy "groups_select_members" on public.groups
for select
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
);

create policy "groups_mutate_admin" on public.groups
for all
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "locations_select_members" on public.locations
for select
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = locations.id
      and lm.user_id = auth.uid()
  )
);

create policy "locations_mutate_admin" on public.locations
for all
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "group_memberships_select_members" on public.group_memberships
for select
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = auth.uid()
  )
);

create policy "group_memberships_mutate_admin" on public.group_memberships
for all
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = group_memberships.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);

create policy "location_memberships_select_members" on public.location_memberships
for select
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or location_memberships.user_id = auth.uid()
);

create policy "location_memberships_mutate_admin" on public.location_memberships
for all
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_memberships.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);
