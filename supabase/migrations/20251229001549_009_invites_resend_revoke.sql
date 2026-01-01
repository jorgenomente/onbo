alter table public.organization_invites
  add column if not exists invited_user_id uuid null,
  add column if not exists last_sent_at timestamptz null,
  add column if not exists send_count int not null default 0;

create index if not exists organization_invites_org_email_idx
  on public.organization_invites(org_id, email);

create index if not exists organization_invites_org_status_idx
  on public.organization_invites(org_id, status);
