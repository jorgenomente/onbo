create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  passing_score int not null default 70,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type text not null check (type in ('mcq')),
  prompt text not null,
  options_json jsonb not null,
  answer_json jsonb not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score int not null,
  passed boolean not null,
  answers_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quizzes_org_module_idx on public.quizzes(org_id, module_id);
create index if not exists questions_org_quiz_idx on public.questions(org_id, quiz_id);
create index if not exists quiz_attempts_org_quiz_idx on public.quiz_attempts(org_id, quiz_id);
create index if not exists quiz_attempts_org_user_idx on public.quiz_attempts(org_id, user_id);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- Quizzes policies

drop policy if exists "quizzes_select_org" on public.quizzes;
create policy "quizzes_select_org"
on public.quizzes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quizzes.org_id
  )
);

drop policy if exists "quizzes_write_admin_trainer" on public.quizzes;
create policy "quizzes_write_admin_trainer"
on public.quizzes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "quizzes_update_admin_trainer" on public.quizzes;
create policy "quizzes_update_admin_trainer"
on public.quizzes
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "quizzes_delete_admin_trainer" on public.quizzes;
create policy "quizzes_delete_admin_trainer"
on public.quizzes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quizzes.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Questions policies

drop policy if exists "questions_select_org" on public.questions;
create policy "questions_select_org"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = questions.org_id
  )
);

drop policy if exists "questions_write_admin_trainer" on public.questions;
create policy "questions_write_admin_trainer"
on public.questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "questions_update_admin_trainer" on public.questions;
create policy "questions_update_admin_trainer"
on public.questions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "questions_delete_admin_trainer" on public.questions;
create policy "questions_delete_admin_trainer"
on public.questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = questions.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Quiz attempts policies

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own"
on public.quiz_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quiz_attempts.org_id
  )
);

drop policy if exists "quiz_attempts_select_org_admin_trainer" on public.quiz_attempts;
create policy "quiz_attempts_select_org_admin_trainer"
on public.quiz_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quiz_attempts.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own"
on public.quiz_attempts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = quiz_attempts.org_id
  )
);
