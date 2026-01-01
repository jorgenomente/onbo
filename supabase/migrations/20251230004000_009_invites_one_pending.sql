create unique index if not exists organization_invites_one_pending_per_email
  on public.organization_invites(org_id, lower(email))
  where status = 'pending';
