alter table public.profiles
add column if not exists email text;

create unique index if not exists profiles_org_email_unique
  on public.profiles (org_id, lower(email))
  where email is not null;
