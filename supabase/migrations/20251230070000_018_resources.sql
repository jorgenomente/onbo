create table if not exists public.org_resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  type text not null check (type in ('link', 'video', 'pdf')),
  url text not null,
  description text null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.module_resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  type text not null check (type in ('link', 'video', 'pdf')),
  url text not null,
  description text null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_resources_org_order_idx
  on public.org_resources(org_id, order_index);

create index if not exists module_resources_org_module_order_idx
  on public.module_resources(org_id, module_id, order_index);

alter table public.org_resources enable row level security;
alter table public.module_resources enable row level security;

-- org_resources policies

drop policy if exists "org_resources_select_org" on public.org_resources;
create policy "org_resources_select_org"
on public.org_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = org_resources.org_id
  )
);

drop policy if exists "org_resources_write_admin_trainer" on public.org_resources;
create policy "org_resources_write_admin_trainer"
on public.org_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = org_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "org_resources_update_admin_trainer" on public.org_resources;
create policy "org_resources_update_admin_trainer"
on public.org_resources
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = org_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = org_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "org_resources_delete_admin_trainer" on public.org_resources;
create policy "org_resources_delete_admin_trainer"
on public.org_resources
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = org_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- module_resources policies

drop policy if exists "module_resources_select_admin_trainer" on public.module_resources;
create policy "module_resources_select_admin_trainer"
on public.module_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "module_resources_select_employee_assigned" on public.module_resources;
create policy "module_resources_select_employee_assigned"
on public.module_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role = 'employee'
  )
  and exists (
    select 1
    from public.assignments a
    where a.org_id = module_resources.org_id
      and a.user_id = auth.uid()
      and a.module_id = module_resources.module_id
  )
);

drop policy if exists "module_resources_write_admin_trainer" on public.module_resources;
create policy "module_resources_write_admin_trainer"
on public.module_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "module_resources_update_admin_trainer" on public.module_resources;
create policy "module_resources_update_admin_trainer"
on public.module_resources
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "module_resources_delete_admin_trainer" on public.module_resources;
create policy "module_resources_delete_admin_trainer"
on public.module_resources
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_resources.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
