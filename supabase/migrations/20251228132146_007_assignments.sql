create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete set null,
  due_date date null,
  status text not null default 'assigned' check (status in ('assigned', 'completed', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, module_id)
);

create index if not exists assignments_org_user_idx on public.assignments(org_id, user_id);
create index if not exists assignments_org_module_idx on public.assignments(org_id, module_id);

alter table public.assignments enable row level security;

-- Employee: select own assignments
drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own"
on public.assignments
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
  )
);

-- Admin/Trainer: select org assignments
drop policy if exists "assignments_select_org_admin_trainer" on public.assignments;
create policy "assignments_select_org_admin_trainer"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Admin/Trainer: insert org assignments
drop policy if exists "assignments_insert_org_admin_trainer" on public.assignments;
create policy "assignments_insert_org_admin_trainer"
on public.assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Admin/Trainer: update org assignments
drop policy if exists "assignments_update_org_admin_trainer" on public.assignments;
create policy "assignments_update_org_admin_trainer"
on public.assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Admin/Trainer: delete org assignments
drop policy if exists "assignments_delete_org_admin_trainer" on public.assignments;
create policy "assignments_delete_org_admin_trainer"
on public.assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = assignments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
