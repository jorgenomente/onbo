alter table public.questions
  add column if not exists content_json jsonb not null default '{}'::jsonb;
