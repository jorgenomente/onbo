alter table public.modules
  add column if not exists location_id uuid null references public.locations (id) on delete set null;

create index if not exists modules_location_id_idx
  on public.modules (location_id);

alter table public.modules
  add column if not exists group_id uuid null references public.groups (id) on delete set null;

create index if not exists modules_group_id_idx
  on public.modules (group_id);
