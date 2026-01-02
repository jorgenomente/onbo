-- Evaluate auth.uid() once per statement in progress admin/trainer select policy.
drop policy if exists "progress_select_org_admin_trainer" on public.progress;
create policy "progress_select_org_admin_trainer"
on public.progress
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
