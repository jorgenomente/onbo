alter table public.group_memberships
  add column if not exists email text null;

create index if not exists group_memberships_email_idx
  on public.group_memberships (email);
