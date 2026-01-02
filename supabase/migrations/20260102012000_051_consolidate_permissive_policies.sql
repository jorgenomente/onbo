-- Consolidate multiple permissive policies for the same role/action.
-- Generated from latest policy definitions in supabase/migrations.

drop policy if exists "assignments_select_own" on public.assignments;
drop policy if exists "assignments_select_org_admin_trainer" on public.assignments;
drop policy if exists "assignments_select_authenticated" on public.assignments;
drop policy if exists "assignments_select_authenticated" on public.assignments;
create policy "assignments_select_authenticated"
on public.assignments
for select
to authenticated
using (
  (user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = assignments.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = assignments.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )))
);

drop policy if exists "courses_select_org" on public.courses;
drop policy if exists "courses_select_same_org" on public.courses;
drop policy if exists "courses_select_authenticated" on public.courses;
drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = courses.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = courses.org_id
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = courses.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = courses.org_id
  )))
);

drop policy if exists "enrollment_modules_select_own" on public.enrollment_modules;
drop policy if exists "enrollment_modules_select_org_admin_trainer" on public.enrollment_modules;
drop policy if exists "enrollment_modules_select_authenticated" on public.enrollment_modules;
drop policy if exists "enrollment_modules_select_authenticated" on public.enrollment_modules;
create policy "enrollment_modules_select_authenticated"
on public.enrollment_modules
for select
to authenticated
using (
  (exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_modules.enrollment_id
      and e.user_id = (select auth.uid())
      and e.org_id = enrollment_modules.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_modules.enrollment_id
      and e.user_id = (select auth.uid())
      and e.org_id = enrollment_modules.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )))
);

drop policy if exists "enrollments_select_own" on public.enrollments;
drop policy if exists "enrollments_select_org_admin_trainer" on public.enrollments;
drop policy if exists "enrollments_select_authenticated" on public.enrollments;
drop policy if exists "enrollments_select_authenticated" on public.enrollments;
create policy "enrollments_select_authenticated"
on public.enrollments
for select
to authenticated
using (
  (user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollments.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollments.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )))
);

drop policy if exists "group_memberships_select_members" on public.group_memberships;
drop policy if exists "read_own_group_memberships" on public.group_memberships;
drop policy if exists "group_memberships_select_authenticated" on public.group_memberships;
drop policy if exists "group_memberships_select_authenticated" on public.group_memberships;
create policy "group_memberships_select_authenticated"
on public.group_memberships
for select
to authenticated
using (
  (group_memberships.user_id = (select auth.uid())) or
    (user_id = (select auth.uid())) or
    ((group_memberships.user_id = (select auth.uid())) or
    (user_id = (select auth.uid())))
);

drop policy if exists "groups_select_members" on public.groups;
drop policy if exists "read_groups_where_member" on public.groups;
drop policy if exists "read_groups_where_location_member" on public.groups;
drop policy if exists "groups_select_authenticated" on public.groups;
drop policy if exists "groups_select_authenticated" on public.groups;
create policy "groups_select_authenticated"
on public.groups
for select
to authenticated
using (
  (exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.locations l
    join public.location_memberships lm
      on lm.location_id = l.id
    where l.group_id = groups.id
      and lm.user_id = (select auth.uid())
  )) or
    ((exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.locations l
    join public.location_memberships lm
      on lm.location_id = l.id
    where l.group_id = groups.id
      and lm.user_id = (select auth.uid())
  )))
);

drop policy if exists "lessons_write_admin_trainer" on public.lessons;
drop policy if exists "lessons_insert_tenancy" on public.lessons;
drop policy if exists "lessons_insert_authenticated" on public.lessons;
create policy "lessons_insert_authenticated"
on public.lessons
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "lessons_select_org" on public.lessons;
drop policy if exists "lessons_select_tenancy" on public.lessons;
drop policy if exists "lessons_select_authenticated" on public.lessons;
drop policy if exists "lessons_select_authenticated" on public.lessons;
create policy "lessons_select_authenticated"
on public.lessons
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )))
);

drop policy if exists "lessons_update_admin_trainer" on public.lessons;
drop policy if exists "lessons_update_tenancy" on public.lessons;
drop policy if exists "lessons_update_authenticated" on public.lessons;
create policy "lessons_update_authenticated"
on public.lessons
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "locations_select_members" on public.locations;
drop policy if exists "locations_select_group_members" on public.locations;
drop policy if exists "locations_select_authenticated" on public.locations;
drop policy if exists "locations_select_authenticated" on public.locations;
create policy "locations_select_authenticated"
on public.locations
for select
to authenticated
using (
  (exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = locations.id
      and lm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.group_memberships gm
    where gm.user_id = (select auth.uid())
      and gm.group_id = locations.group_id
  )) or
    ((exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = locations.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = locations.id
      and lm.user_id = (select auth.uid())
  )) or
    (exists (
    select 1
    from public.group_memberships gm
    where gm.user_id = (select auth.uid())
      and gm.group_id = locations.group_id
  )))
);

drop policy if exists "module_resources_delete_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_delete_tenancy" on public.module_resources;
drop policy if exists "module_resources_delete_authenticated" on public.module_resources;
create policy "module_resources_delete_authenticated"
on public.module_resources
for delete
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "module_resources_write_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_insert_tenancy" on public.module_resources;
drop policy if exists "module_resources_insert_authenticated" on public.module_resources;
create policy "module_resources_insert_authenticated"
on public.module_resources
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "module_resources_select_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_select_employee_assigned" on public.module_resources;
drop policy if exists "module_resources_select_tenancy" on public.module_resources;
drop policy if exists "module_resources_select_authenticated" on public.module_resources;
drop policy if exists "module_resources_select_authenticated" on public.module_resources;
create policy "module_resources_select_authenticated"
on public.module_resources
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role = 'employee'
  )
  and exists (
    select 1
    from public.assignments a
    where a.org_id = module_resources.org_id
      and a.user_id = (select auth.uid())
      and a.module_id = module_resources.module_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role = 'employee'
  )
  and exists (
    select 1
    from public.assignments a
    where a.org_id = module_resources.org_id
      and a.user_id = (select auth.uid())
      and a.module_id = module_resources.module_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )))
);

drop policy if exists "module_resources_update_admin_trainer" on public.module_resources;
drop policy if exists "module_resources_update_tenancy" on public.module_resources;
drop policy if exists "module_resources_update_authenticated" on public.module_resources;
create policy "module_resources_update_authenticated"
on public.module_resources
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_resources.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "module_units_delete_admin_trainer" on public.module_units;
drop policy if exists "module_units_delete_tenancy" on public.module_units;
drop policy if exists "module_units_delete_authenticated" on public.module_units;
create policy "module_units_delete_authenticated"
on public.module_units
for delete
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "module_units_write_admin_trainer" on public.module_units;
drop policy if exists "module_units_insert_tenancy" on public.module_units;
drop policy if exists "module_units_insert_authenticated" on public.module_units;
create policy "module_units_insert_authenticated"
on public.module_units
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "module_units_select_org" on public.module_units;
drop policy if exists "module_units_select_tenancy" on public.module_units;
drop policy if exists "module_units_select_authenticated" on public.module_units;
drop policy if exists "module_units_select_authenticated" on public.module_units;
create policy "module_units_select_authenticated"
on public.module_units
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )))
);

drop policy if exists "module_units_update_admin_trainer" on public.module_units;
drop policy if exists "module_units_update_tenancy" on public.module_units;
drop policy if exists "module_units_update_authenticated" on public.module_units;
create policy "module_units_update_authenticated"
on public.module_units
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = module_units.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "modules_delete_admin_trainer" on public.modules;
drop policy if exists "modules_delete_tenancy" on public.modules;
drop policy if exists "modules_delete_authenticated" on public.modules;
create policy "modules_delete_authenticated"
on public.modules
for delete
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  ))
);

drop policy if exists "modules_write_admin_trainer" on public.modules;
drop policy if exists "modules_insert_tenancy" on public.modules;
drop policy if exists "modules_insert_authenticated" on public.modules;
create policy "modules_insert_authenticated"
on public.modules
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  ))
);

drop policy if exists "modules_select_org" on public.modules;
drop policy if exists "modules_select_tenancy" on public.modules;
drop policy if exists "modules_select_authenticated" on public.modules;
drop policy if exists "modules_select_authenticated" on public.modules;
create policy "modules_select_authenticated"
on public.modules
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and (
        lm.role in ('location_admin', 'trainer')
        or (lm.role = 'employee' and modules.status = 'published')
      )
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and (
        lm.role in ('location_admin', 'trainer')
        or (lm.role = 'employee' and modules.status = 'published')
      )
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  )))
);

drop policy if exists "modules_update_admin_trainer" on public.modules;
drop policy if exists "modules_update_tenancy" on public.modules;
drop policy if exists "modules_update_authenticated" on public.modules;
create policy "modules_update_authenticated"
on public.modules
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.org_id = modules.org_id
        and p.role in ('org_admin', 'trainer')
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = (select auth.uid())
      and lm.role in ('location_admin', 'trainer')
  )
  or exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = modules.location_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'group_admin'
  ))
);

drop policy if exists "organization_invites_admin_trainer_select" on public.organization_invites;
drop policy if exists "organization_invites_self_pending_select" on public.organization_invites;
drop policy if exists "organization_invites_select_authenticated" on public.organization_invites;
drop policy if exists "organization_invites_select_authenticated" on public.organization_invites;
create policy "organization_invites_select_authenticated"
on public.organization_invites
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (status = 'pending'
  and lower(email) = lower(((select current_setting('request.jwt.claims', true))::json ->> 'email'))) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (status = 'pending'
  and lower(email) = lower(((select current_setting('request.jwt.claims', true))::json ->> 'email'))))
);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_org_admin" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (
  (user_id = (select auth.uid())) or
    (org_id = public.current_org_id()
  and public.current_role() in ('org_admin', 'trainer')) or
    ((user_id = (select auth.uid())) or
    (org_id = public.current_org_id()
  and public.current_role() in ('org_admin', 'trainer')))
);

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_select_org_admin_trainer" on public.progress;
drop policy if exists "progress_select_authenticated" on public.progress;
drop policy if exists "progress_select_authenticated" on public.progress;
create policy "progress_select_authenticated"
on public.progress
for select
to authenticated
using (
  (user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    ((user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
      and p.role in ('org_admin', 'trainer')
  )))
);

drop policy if exists "questions_delete_admin_trainer" on public.questions;
drop policy if exists "questions_delete_tenancy" on public.questions;
drop policy if exists "questions_delete_authenticated" on public.questions;
create policy "questions_delete_authenticated"
on public.questions
for delete
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "questions_write_admin_trainer" on public.questions;
drop policy if exists "questions_insert_tenancy" on public.questions;
drop policy if exists "questions_insert_authenticated" on public.questions;
create policy "questions_insert_authenticated"
on public.questions
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "questions_select_org" on public.questions;
drop policy if exists "questions_select_tenancy" on public.questions;
drop policy if exists "questions_select_authenticated" on public.questions;
drop policy if exists "questions_select_authenticated" on public.questions;
create policy "questions_select_authenticated"
on public.questions
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and q.status = 'published')
            )
        )
      )
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and q.status = 'published')
            )
        )
      )
  )))
);

drop policy if exists "questions_update_admin_trainer" on public.questions;
drop policy if exists "questions_update_tenancy" on public.questions;
drop policy if exists "questions_update_authenticated" on public.questions;
create policy "questions_update_authenticated"
on public.questions
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_tenancy" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_authenticated" on public.quiz_attempts;
create policy "quiz_attempts_insert_authenticated"
on public.quiz_attempts
for insert
to authenticated
with check (
  (user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quiz_attempts.org_id
  )) or
    (user_id = (select auth.uid())
  and exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  ))
);

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_org_admin_trainer" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_own_tenancy" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_admin_tenancy" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_authenticated" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_authenticated" on public.quiz_attempts;
create policy "quiz_attempts_select_authenticated"
on public.quiz_attempts
for select
to authenticated
using (
  (user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quiz_attempts.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quiz_attempts.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (user_id = (select auth.uid())
  and exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )) or
    ((user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quiz_attempts.org_id
  )) or
    (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quiz_attempts.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (user_id = (select auth.uid())
  and exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
        )
      )
  )) or
    (exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )))
);

drop policy if exists "quizzes_delete_admin_trainer" on public.quizzes;
drop policy if exists "quizzes_delete_tenancy" on public.quizzes;
drop policy if exists "quizzes_delete_authenticated" on public.quizzes;
create policy "quizzes_delete_authenticated"
on public.quizzes
for delete
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "quizzes_write_admin_trainer" on public.quizzes;
drop policy if exists "quizzes_insert_tenancy" on public.quizzes;
drop policy if exists "quizzes_insert_authenticated" on public.quizzes;
create policy "quizzes_insert_authenticated"
on public.quizzes
for insert
to authenticated
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);

drop policy if exists "quizzes_select_org" on public.quizzes;
drop policy if exists "quizzes_select_tenancy" on public.quizzes;
drop policy if exists "quizzes_select_authenticated" on public.quizzes;
drop policy if exists "quizzes_select_authenticated" on public.quizzes;
create policy "quizzes_select_authenticated"
on public.quizzes
for select
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and quizzes.status = 'published')
            )
        )
      )
  )) or
    ((exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and quizzes.status = 'published')
            )
        )
      )
  )))
);

drop policy if exists "quizzes_update_admin_trainer" on public.quizzes;
drop policy if exists "quizzes_update_tenancy" on public.quizzes;
drop policy if exists "quizzes_update_authenticated" on public.quizzes;
create policy "quizzes_update_authenticated"
on public.quizzes
for update
to authenticated
using (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
)
with check (
  (exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )) or
    (exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = (select auth.uid())
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = (select auth.uid())
            and lm.role in ('location_admin', 'trainer')
        )
      )
  ))
);
