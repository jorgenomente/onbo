alter table public.quizzes
  add column if not exists unit_id uuid null references public.module_units(id) on delete cascade;

alter table public.quizzes
  alter column module_id drop not null;

alter table public.quizzes
  drop constraint if exists quizzes_module_unit_check;

alter table public.quizzes
  add constraint quizzes_module_unit_check
  check (
    (module_id is not null and unit_id is null)
    or (module_id is null and unit_id is not null)
  );

create index if not exists quizzes_org_unit_idx on public.quizzes(org_id, unit_id);
