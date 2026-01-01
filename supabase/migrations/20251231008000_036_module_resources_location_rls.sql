alter table public.module_resources enable row level security;

drop policy if exists "module_resources_select_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_select_employee_assigned" on public.module_resources;
drop policy if exists "module_resources_write_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_update_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_delete_admin_trainer" on public.module_resources;

create policy "module_resources_select_tenancy"
on public.module_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
        )
      )
  )
);

create policy "module_resources_insert_tenancy"
on public.module_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "module_resources_update_tenancy"
on public.module_resources
for update
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "module_resources_delete_tenancy"
on public.module_resources
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);
