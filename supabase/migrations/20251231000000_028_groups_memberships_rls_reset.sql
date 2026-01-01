-- Reset group/group_membership policies to avoid recursion (42P17).
do $$
begin
  -- Drop policies on group_memberships.
  execute 'drop policy if exists "group_memberships_select_members" on public.group_memberships';
  execute 'drop policy if exists "group_memberships_mutate_admin" on public.group_memberships';
  execute 'drop policy if exists "group_memberships_select_self" on public.group_memberships';
  execute 'drop policy if exists "group_memberships_read_own" on public.group_memberships';

  -- Drop policies on groups.
  execute 'drop policy if exists "groups_select_members" on public.groups';
  execute 'drop policy if exists "groups_mutate_admin" on public.groups';
  execute 'drop policy if exists "groups_select_memberships" on public.groups';
  execute 'drop policy if exists "read_groups_where_member" on public.groups';
end $$;

alter table public.group_memberships enable row level security;
alter table public.groups enable row level security;

create policy "read_own_group_memberships"
on public.group_memberships
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "read_groups_where_member"
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
