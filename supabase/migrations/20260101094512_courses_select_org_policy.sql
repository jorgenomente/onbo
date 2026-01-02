alter table public.courses enable row level security;

drop policy if exists "courses_select_same_org" on public.courses;
create policy "courses_select_same_org"
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = courses.org_id
  )
);
