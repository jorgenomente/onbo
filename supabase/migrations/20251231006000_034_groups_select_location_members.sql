alter table public.groups enable row level security;

drop policy if exists "read_groups_where_location_member" on public.groups;

create policy "read_groups_where_location_member"
on public.groups
for select
to authenticated
using (
  exists (
    select 1
    from public.locations l
    join public.location_memberships lm
      on lm.location_id = l.id
    where l.group_id = groups.id
      and lm.user_id = auth.uid()
  )
);
