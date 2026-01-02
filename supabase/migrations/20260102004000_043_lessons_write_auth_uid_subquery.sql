-- Evaluate auth.uid() once per statement in lessons insert policy.
drop policy if exists "lessons_write_admin_trainer" on public.lessons;
create policy "lessons_write_admin_trainer"
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
