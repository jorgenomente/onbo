alter table public.location_memberships enable row level security;
alter table public.locations enable row level security;

drop policy if exists "location_memberships_mutate_admin" on public.location_memberships;
drop policy if exists "location_memberships_select_members" on public.location_memberships;

create policy "location_memberships_select_own"
on public.location_memberships
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "locations_select_members" on public.locations;
create policy "locations_select_members"
on public.locations
for select
to authenticated
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
