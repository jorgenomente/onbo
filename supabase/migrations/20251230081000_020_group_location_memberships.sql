create table if not exists public.group_memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('group_admin', 'group_member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_memberships_user_id_idx
  on public.group_memberships (user_id);

create table if not exists public.location_memberships (
  location_id uuid not null references public.locations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('location_admin', 'trainer', 'employee')),
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);

create index if not exists location_memberships_user_id_idx
  on public.location_memberships (user_id);
