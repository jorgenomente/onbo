alter table public.modules enable row level security;

drop policy if exists "modules_select_tenancy" on public.modules;

create policy "modules_select_tenancy"
on public.modules
for select
to authenticated
using (
  (
    modules.location_id is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.org_id = modules.org_id
    )
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = modules.location_id
      and lm.user_id = auth.uid()
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
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
);
