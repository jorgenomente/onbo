alter table public.quizzes
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'published'));
