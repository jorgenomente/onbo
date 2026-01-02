-- Evaluate auth.uid() once per statement in organizations insert policy.
drop policy if exists "org_insert_authenticated" on public.organizations;
create policy "org_insert_authenticated"
on public.organizations
for insert
to authenticated
with check (created_by = (select auth.uid()));
