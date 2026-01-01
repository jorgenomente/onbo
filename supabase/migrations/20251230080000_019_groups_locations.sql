create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists groups_slug_idx on public.groups (slug);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (group_id, slug)
);

create index if not exists locations_group_id_idx on public.locations (group_id);
create index if not exists locations_group_slug_idx on public.locations (group_id, slug);
