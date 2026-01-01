alter table public.progress
  add column if not exists updated_at timestamptz not null default now();

update public.progress
set updated_at = completed_at
where updated_at is null;

alter table public.progress drop constraint if exists progress_status_check;

update public.progress
set status = 'done'
where status = 'completed';

alter table public.progress
  alter column status set default 'in_progress';

alter table public.progress
  add constraint progress_status_check check (status in ('in_progress', 'done'));

create unique index if not exists progress_org_user_module_lesson_key
  on public.progress(org_id, user_id, module_id, lesson_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own"
on public.progress
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = progress.org_id
  )
);
