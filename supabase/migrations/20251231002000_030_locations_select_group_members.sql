alter table public.locations enable row level security;

drop policy if exists "locations_select_group_members" on public.locations;
create policy "locations_select_group_members"
on public.locations
for select
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.user_id = auth.uid()
      and gm.group_id = locations.group_id
  )
);
