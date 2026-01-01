alter table public.lessons enable row level security;

drop policy if exists "lessons_select_tenancy" on public.lessons;
create policy "lessons_select_tenancy"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
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

drop policy if exists "lessons_insert_tenancy" on public.lessons;
create policy "lessons_insert_tenancy"
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
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

drop policy if exists "lessons_update_tenancy" on public.lessons;
create policy "lessons_update_tenancy"
on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = lessons.module_id
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
    where m.id = lessons.module_id
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
