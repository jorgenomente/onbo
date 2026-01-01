create table if not exists public.module_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lessons
  add column if not exists unit_id uuid null references public.module_units(id) on delete cascade;

create index if not exists module_units_org_module_order_idx
  on public.module_units(org_id, module_id, order_index);

create index if not exists lessons_org_unit_order_idx
  on public.lessons(org_id, unit_id, order_index);

alter table public.module_units enable row level security;

-- Module units policies

drop policy if exists "module_units_select_org" on public.module_units;
create policy "module_units_select_org"
on public.module_units
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_units.org_id
  )
);

drop policy if exists "module_units_write_admin_trainer" on public.module_units;
create policy "module_units_write_admin_trainer"
on public.module_units
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "module_units_update_admin_trainer" on public.module_units;
create policy "module_units_update_admin_trainer"
on public.module_units
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "module_units_delete_admin_trainer" on public.module_units;
create policy "module_units_delete_admin_trainer"
on public.module_units
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = module_units.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Data migration: convert existing lessons into units and attach lessons

with source as (
  select
    id as lesson_id,
    org_id,
    module_id,
    title,
    order_index,
    gen_random_uuid() as unit_id
  from public.lessons
  where unit_id is null
),
insert_units as (
  insert into public.module_units (
    id,
    org_id,
    module_id,
    title,
    description,
    order_index
  )
  select
    unit_id,
    org_id,
    module_id,
    title,
    null,
    order_index
  from source
  returning id
)
update public.lessons l
set
  unit_id = s.unit_id,
  title = case
    when l.content_json is null
      or l.content_json = '{}'::jsonb
      or l.content_json = '[]'::jsonb
      then 'Leccion 1'
    else l.title
  end,
  content_json = case
    when l.content_json is null
      or l.content_json = '{}'::jsonb
      then '[]'::jsonb
    else l.content_json
  end,
  order_index = 1
from source s
where l.id = s.lesson_id;
