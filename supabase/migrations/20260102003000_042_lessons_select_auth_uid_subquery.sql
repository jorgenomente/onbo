-- Evaluate auth.uid() once per statement in lessons select policy.
drop policy if exists "lessons_select_org" on public.lessons;
create policy "lessons_select_org"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.org_id = lessons.org_id
  )
);
