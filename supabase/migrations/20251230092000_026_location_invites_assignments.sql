create table if not exists public.location_invites (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('trainer', 'employee')),
  token text not null unique,
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  invited_by uuid null references auth.users (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create index if not exists location_invites_location_id_idx
  on public.location_invites (location_id);
create index if not exists location_invites_email_idx
  on public.location_invites (email);
create unique index if not exists location_invites_location_email_status_idx
  on public.location_invites (location_id, email, status);

create table if not exists public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  due_date date null,
  status text not null check (status in ('assigned', 'completed')) default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists course_assignments_unique_idx
  on public.course_assignments (location_id, module_id, user_id);
create index if not exists course_assignments_location_id_idx
  on public.course_assignments (location_id);
create index if not exists course_assignments_user_id_idx
  on public.course_assignments (user_id);
create index if not exists course_assignments_module_id_idx
  on public.course_assignments (module_id);

alter table public.location_invites enable row level security;
alter table public.course_assignments enable row level security;

create policy "location_invites_select_admins"
on public.location_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_invites.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = location_invites.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "location_invites_write_admins"
on public.location_invites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_invites.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = location_invites.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "location_invites_update_admins"
on public.location_invites
for update
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_invites.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = location_invites.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_invites.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = location_invites.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "location_invites_delete_admins"
on public.location_invites
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = location_invites.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = location_invites.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "course_assignments_select"
on public.course_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = course_assignments.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = course_assignments.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
  or (
    course_assignments.user_id = auth.uid()
    and exists (
      select 1
      from public.location_memberships lm
      where lm.location_id = course_assignments.location_id
        and lm.user_id = auth.uid()
    )
  )
);

create policy "course_assignments_insert"
on public.course_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = course_assignments.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = course_assignments.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "course_assignments_update"
on public.course_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = course_assignments.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = course_assignments.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = course_assignments.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = course_assignments.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);

create policy "course_assignments_delete"
on public.course_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_memberships gm
    join public.locations l on l.group_id = gm.group_id
    where l.id = course_assignments.location_id
      and gm.user_id = auth.uid()
      and gm.role = 'group_admin'
  )
  or exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = course_assignments.location_id
      and lm.user_id = auth.uid()
      and lm.role in ('location_admin', 'trainer')
  )
);
