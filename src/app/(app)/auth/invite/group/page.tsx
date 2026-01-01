import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export default async function GroupInviteAcceptPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const token = sp.token?.trim();

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Invitación inválida</h1>
        <p className="text-sm text-muted-foreground">
          No encontramos el token de invitación.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Sesión requerida</h1>
        <p className="text-sm text-muted-foreground">
          Iniciá sesión desde el link del email para completar la invitación.
        </p>
      </div>
    );
  }

  const adminClient = createServiceRoleClient();
  const { data: invite } = await adminClient
    .from('group_invites')
    .select('id, group_id, email, status')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Invitación no disponible</h1>
        <p className="text-sm text-muted-foreground">
          Este link es inválido o ya fue usado.
        </p>
      </div>
    );
  }

  const userEmail = user.email.toLowerCase().trim();
  const inviteEmail = invite.email.toLowerCase().trim();
  if (userEmail !== inviteEmail) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Email incorrecto</h1>
        <p className="text-sm text-muted-foreground">
          Esta invitación corresponde a otro email.
        </p>
      </div>
    );
  }

  const { data: group } = await adminClient
    .from('groups')
    .select('id, slug')
    .eq('id', invite.group_id)
    .maybeSingle();

  if (!group) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Grupo no disponible</h1>
        <p className="text-sm text-muted-foreground">
          No encontramos el grupo asociado a esta invitación.
        </p>
      </div>
    );
  }

  const { error: membershipError } = await adminClient
    .from('group_memberships')
    .upsert(
      {
        group_id: invite.group_id,
        user_id: user.id,
        role: 'group_admin',
        email: inviteEmail,
      },
      { onConflict: 'group_id,user_id' },
    );

  if (membershipError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">No se pudo asignar acceso</h1>
        <p className="text-sm text-muted-foreground">
          Intentalo nuevamente o contactá al administrador.
        </p>
      </div>
    );
  }

  await adminClient
    .from('group_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  redirect(`/${group.slug}`);
}
