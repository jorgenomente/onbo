create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists progress_org_user_idx on public.progress(org_id, user_id);
create index if not exists progress_org_module_idx on public.progress(org_id, module_id);

alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
on public.progress
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
  )
);

drop policy if exists "progress_select_org_admin_trainer" on public.progress;
create policy "progress_select_org_admin_trainer"
on public.progress
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own"
on public.progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
  )
);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own"
on public.progress
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
  )
);
