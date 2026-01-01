alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;

drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members"
on public.groups
for select
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "group_memberships_select_members" on public.group_memberships;
create policy "group_memberships_select_members"
on public.group_memberships
for select
to authenticated
using (
  group_memberships.user_id = auth.uid()
);
