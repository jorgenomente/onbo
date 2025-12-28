create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modules_org_order_idx on public.modules(org_id, order_index);
create index if not exists lessons_org_module_order_idx on public.lessons(org_id, module_id, order_index);

alter table public.modules enable row level security;
alter table public.lessons enable row level security;

-- Modules policies
drop policy if exists "modules_select_org" on public.modules;
create policy "modules_select_org"
on public.modules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = modules.org_id
  )
);

drop policy if exists "modules_write_admin_trainer" on public.modules;
create policy "modules_write_admin_trainer"
on public.modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "modules_update_admin_trainer" on public.modules;
create policy "modules_update_admin_trainer"
on public.modules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "modules_delete_admin_trainer" on public.modules;
create policy "modules_delete_admin_trainer"
on public.modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Lessons policies
drop policy if exists "lessons_select_org" on public.lessons;
create policy "lessons_select_org"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = lessons.org_id
  )
);

drop policy if exists "lessons_write_admin_trainer" on public.lessons;
create policy "lessons_write_admin_trainer"
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "lessons_update_admin_trainer" on public.lessons;
create policy "lessons_update_admin_trainer"
on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "lessons_delete_admin_trainer" on public.lessons;
create policy "lessons_delete_admin_trainer"
on public.lessons
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
