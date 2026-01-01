-- Allow authenticated users to read their own pending invites by email.
drop policy if exists "organization_invites_self_pending_select" on public.organization_invites;
create policy "organization_invites_self_pending_select"
on public.organization_invites
for select
to authenticated
using (
  status = 'pending'
  and lower(email) = lower((current_setting('request.jwt.claims', true)::json ->> 'email'))
);
