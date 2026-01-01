import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';
import InviteForm from './invite-form';
import SendPasswordSetupLinkButton from './SendPasswordSetupLinkButton';

export default async function LocationInvitesPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  const access = await requireLocationAccess(groupSlug, locationSlug);

  const supabase = await createSupabaseServerClient();
  const { data: invites } = await supabase
    .from('location_invites')
    .select('id, email, role, status, created_at')
    .eq('location_id', access.location.id)
    .order('created_at', { ascending: false });

  const inviteList = invites ?? [];
  const canSendPasswordLink =
    access.roles.isGroupAdmin ||
    access.roles.locationRole === 'location_admin' ||
    access.roles.locationRole === 'trainer';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invitaciones</h1>
          <p className="text-sm text-muted-foreground">
            {access.group.name} · {access.location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}`}>
            Volver al local
          </Link>
        </Button>
      </header>

      <InviteForm locationId={access.location.id} />

      <section className="space-y-3">
        {inviteList.length ? (
          <div className="space-y-2 text-sm">
            {inviteList.map((invite) => (
              <div key={invite.id} className="rounded-lg border px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · {invite.status}
                    </p>
                  </div>
                  {canSendPasswordLink ? (
                    <SendPasswordSetupLinkButton
                      email={invite.email}
                      locationId={access.location.id}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay invitaciones pendientes.
          </p>
        )}
      </section>
    </div>
  );
}
