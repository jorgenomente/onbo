create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  email text not null,
  role text not null check (role in ('group_admin')),
  token text not null unique,
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  invited_by uuid null references auth.users (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create index if not exists group_invites_group_id_idx
  on public.group_invites (group_id);
create index if not exists group_invites_email_idx
  on public.group_invites (email);
create unique index if not exists group_invites_group_email_status_idx
  on public.group_invites (group_id, email, status);

alter table public.group_invites enable row level security;
