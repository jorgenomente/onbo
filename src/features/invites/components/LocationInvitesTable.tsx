import { Button } from '@/components/ui/button';
import CopyInviteLinkButton from '@/features/invites/components/CopyInviteLinkButton';
import SendPasswordForEmailButton from '@/features/invites/components/SendPasswordForEmailButton';
import { getLocationInvites } from '@/features/invites/queries';
import {
  resendLocationInvite,
  revokeLocationInvite,
} from '@/features/invites/actions';

type LocationInvitesTableProps = {
  groupSlug: string;
  locationSlug: string;
  locationId: string;
  canManage: boolean;
  showPasswordLink?: boolean;
  lifecycleLabelByInviteId?: Map<string, string>;
  lifecycleNoteByInviteId?: Map<string, string>;
};

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('es-ES');
}

export default async function LocationInvitesTable({
  groupSlug,
  locationSlug,
  locationId,
  canManage,
  showPasswordLink = true,
  lifecycleLabelByInviteId,
  lifecycleNoteByInviteId,
}: LocationInvitesTableProps) {
  const invites = await getLocationInvites(locationId);
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';

  if (!invites.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay invitaciones para este local.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {invites.map((invite) => {
        const inviteLink = `${appUrl}/auth/setup-password?next=${encodeURIComponent(
          `/auth/accept-invite?token=${invite.token}`,
        )}`;

        return (
          <div key={invite.id} className="rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.role} · {invite.status}
                </p>
                {lifecycleLabelByInviteId ? (
                  <span className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                    {lifecycleLabelByInviteId.get(invite.id) ?? invite.status}
                  </span>
                ) : null}
                {lifecycleNoteByInviteId?.get(invite.id) ? (
                  <p className="text-xs text-amber-600">
                    {lifecycleNoteByInviteId.get(invite.id)}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Creado: {formatDate(invite.created_at)} · Aceptado:{' '}
                  {formatDate(invite.accepted_at)}
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  {invite.status === 'pending' ? (
                    <>
                      <form action={resendLocationInvite}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          Reenviar link de acceso
                        </Button>
                      </form>
                      <CopyInviteLinkButton link={inviteLink} />
                      <form action={revokeLocationInvite}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Revocar
                        </Button>
                      </form>
                    </>
                  ) : null}
                  {showPasswordLink ? (
                    <SendPasswordForEmailButton
                      email={invite.email}
                      locationId={locationId}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
