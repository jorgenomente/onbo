alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "quizzes_select_org" on public.quizzes;
drop policy if exists "quizzes_write_admin_trainer" on public.quizzes;
drop policy if exists "quizzes_update_admin_trainer" on public.quizzes;
drop policy if exists "quizzes_delete_admin_trainer" on public.quizzes;

drop policy if exists "questions_select_org" on public.questions;
drop policy if exists "questions_write_admin_trainer" on public.questions;
drop policy if exists "questions_update_admin_trainer" on public.questions;
drop policy if exists "questions_delete_admin_trainer" on public.questions;

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_org_admin_trainer" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;

create policy "quizzes_select_tenancy"
on public.quizzes
for select
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and quizzes.status = 'published')
            )
        )
      )
  )
);

create policy "quizzes_insert_tenancy"
on public.quizzes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "quizzes_update_tenancy"
on public.quizzes
for update
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "quizzes_delete_tenancy"
on public.quizzes
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = quizzes.module_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "questions_select_tenancy"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and (
              lm.role in ('location_admin', 'trainer')
              or (lm.role = 'employee' and q.status = 'published')
            )
        )
      )
  )
);

create policy "questions_insert_tenancy"
on public.questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "questions_update_tenancy"
on public.questions
for update
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "questions_delete_tenancy"
on public.questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = questions.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "quiz_attempts_select_own_tenancy"
on public.quiz_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
        )
      )
  )
);

create policy "quiz_attempts_select_admin_tenancy"
on public.quiz_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
            and lm.role in ('location_admin', 'trainer')
        )
      )
  )
);

create policy "quiz_attempts_insert_tenancy"
on public.quiz_attempts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = quiz_attempts.quiz_id
      and m.location_id is not null
      and (
        exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = m.group_id
            and gm.user_id = auth.uid()
            and gm.role = 'group_admin'
        )
        or exists (
          select 1
          from public.location_memberships lm
          where lm.location_id = m.location_id
            and lm.user_id = auth.uid()
        )
      )
  )
);
