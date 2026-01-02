-- Evaluate auth.uid() once per statement in progress select policy.
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
on public.progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = progress.org_id
  )
);
