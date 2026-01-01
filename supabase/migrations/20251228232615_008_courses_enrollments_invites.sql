create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text null,
  interval_days_default int not null default 4 check (interval_days_default >= 1),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  order_index int not null default 0,
  unique (course_id, module_id)
);

create index if not exists course_modules_course_order_idx on public.course_modules(course_id, order_index);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete set null,
  start_date date not null default current_date,
  interval_days int not null default 4 check (interval_days >= 1),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enrollments_org_user_idx on public.enrollments(org_id, user_id);
create index if not exists enrollments_org_course_idx on public.enrollments(org_id, course_id);
create unique index if not exists enrollments_one_active_per_user
  on public.enrollments(org_id, user_id)
  where status = 'active';

create table if not exists public.enrollment_modules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete restrict,
  order_index int not null default 0,
  due_date date not null,
  completed_at timestamptz null,
  unique (enrollment_id, module_id)
);

create index if not exists enrollment_modules_enrollment_order_idx
  on public.enrollment_modules(enrollment_id, order_index);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'employee' check (role in ('employee', 'trainer', 'org_admin')),
  course_id uuid null references public.courses(id) on delete set null,
  auto_assign_course boolean not null default false,
  interval_days_override int null,
  invited_by uuid not null references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create unique index if not exists organization_invites_pending_unique
  on public.organization_invites(org_id, email)
  where status = 'pending';

do $$
begin
  if to_regclass('public.quizzes') is not null then
    alter table public.quizzes
      add column if not exists course_id uuid references public.courses(id) on delete cascade;
    if not exists (
      select 1
      from pg_constraint
      where conname = 'quizzes_module_or_course_ck'
    ) then
      alter table public.quizzes
        add constraint quizzes_module_or_course_ck
        check (
          (module_id is not null and course_id is null)
          or (module_id is null and course_id is not null)
        );
    end if;
  end if;
end $$;

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_modules enable row level security;
alter table public.organization_invites enable row level security;

-- Courses policies
drop policy if exists "courses_select_org" on public.courses;
create policy "courses_select_org"
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

drop policy if exists "courses_write_admin_trainer" on public.courses;
create policy "courses_write_admin_trainer"
on public.courses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = courses.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "courses_update_admin_trainer" on public.courses;
create policy "courses_update_admin_trainer"
on public.courses
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = courses.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = courses.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "courses_delete_admin_trainer" on public.courses;
create policy "courses_delete_admin_trainer"
on public.courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = courses.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Course modules policies
drop policy if exists "course_modules_select_org" on public.course_modules;
create policy "course_modules_select_org"
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = course_modules.org_id
  )
);

drop policy if exists "course_modules_write_admin_trainer" on public.course_modules;
create policy "course_modules_write_admin_trainer"
on public.course_modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = course_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "course_modules_update_admin_trainer" on public.course_modules;
create policy "course_modules_update_admin_trainer"
on public.course_modules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = course_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = course_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "course_modules_delete_admin_trainer" on public.course_modules;
create policy "course_modules_delete_admin_trainer"
on public.course_modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = course_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Enrollments policies
drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own"
on public.enrollments
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
  )
);

drop policy if exists "enrollments_select_org_admin_trainer" on public.enrollments;
create policy "enrollments_select_org_admin_trainer"
on public.enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollments_write_admin_trainer" on public.enrollments;
create policy "enrollments_write_admin_trainer"
on public.enrollments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollments_update_admin_trainer" on public.enrollments;
create policy "enrollments_update_admin_trainer"
on public.enrollments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollments_delete_admin_trainer" on public.enrollments;
create policy "enrollments_delete_admin_trainer"
on public.enrollments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollments.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Enrollment modules policies
drop policy if exists "enrollment_modules_select_own" on public.enrollment_modules;
create policy "enrollment_modules_select_own"
on public.enrollment_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_modules.enrollment_id
      and e.user_id = auth.uid()
      and e.org_id = enrollment_modules.org_id
  )
);

drop policy if exists "enrollment_modules_select_org_admin_trainer" on public.enrollment_modules;
create policy "enrollment_modules_select_org_admin_trainer"
on public.enrollment_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollment_modules_write_admin_trainer" on public.enrollment_modules;
create policy "enrollment_modules_write_admin_trainer"
on public.enrollment_modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollment_modules_update_admin_trainer" on public.enrollment_modules;
create policy "enrollment_modules_update_admin_trainer"
on public.enrollment_modules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "enrollment_modules_delete_admin_trainer" on public.enrollment_modules;
create policy "enrollment_modules_delete_admin_trainer"
on public.enrollment_modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = enrollment_modules.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

-- Organization invites policies
drop policy if exists "organization_invites_admin_trainer_select" on public.organization_invites;
create policy "organization_invites_admin_trainer_select"
on public.organization_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "organization_invites_admin_trainer_insert" on public.organization_invites;
create policy "organization_invites_admin_trainer_insert"
on public.organization_invites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "organization_invites_admin_trainer_update" on public.organization_invites;
create policy "organization_invites_admin_trainer_update"
on public.organization_invites
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )
);

drop policy if exists "organization_invites_admin_trainer_delete" on public.organization_invites;
create policy "organization_invites_admin_trainer_delete"
on public.organization_invites
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = organization_invites.org_id
      and p.role in ('org_admin', 'trainer')
  )
);
