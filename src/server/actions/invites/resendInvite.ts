'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const resendInviteSchema = z.object({
  invite_id: z.string().uuid(),
});

export type ResendInviteState = {
  ok: boolean;
  mode?: 'link_generated';
  invite_id?: string;
  message?: string;
  dev_link?: string;
  error?: string;
};

export async function resendInvite(
  _prevState: ResendInviteState,
  formData: FormData,
): Promise<ResendInviteState> {
  if (!formData) {
    return { ok: false, error: 'Invite inválido.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { ok: false, error: 'No autorizado.' };
  }

  const parsed = resendInviteSchema.safeParse({
    invite_id: formData.get('invite_id'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Invite inválido.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from('organization_invites')
    .select('id, email, status, send_count')
    .eq('id', parsed.data.invite_id)
    .eq('org_id', profile.org_id)
    .single();

  if (!invite || invite.status !== 'pending') {
    return { ok: false, error: 'Invite no está pending.' };
  }

  const adminClient = createSupabaseAdminClient();
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo = `${appUrl}/auth/setup-password?inviteId=${invite.id}`;

  const inviteResponse = await adminClient.auth.admin.inviteUserByEmail(
    invite.email,
    { redirectTo },
  );

  if (inviteResponse.error) {
    if (
      inviteResponse.error.message?.toLowerCase().includes('already been registered')
    ) {
      return {
        ok: true,
        message: 'Usuario ya existe. Pedile que inicie sesión para aceptar.',
        invite_id: invite.id,
      };
    }
    return {
      ok: false,
      error: inviteResponse.error.message ?? 'No se pudo enviar el email.',
    };
  }

  const invitedUserId = inviteResponse.data?.user?.id ?? null;

  await supabase
    .from('organization_invites')
    .update({
      invited_user_id: invitedUserId ?? null,
      last_sent_at: new Date().toISOString(),
      send_count: (invite.send_count ?? 0) + 1,
    })
    .eq('id', invite.id);

  console.log('[invite] invite sent', { invite_id: invite.id, email: invite.email });

  revalidatePath('/settings/members');
  return {
    ok: true,
    mode: 'link_generated',
    message: 'Invitación enviada. El usuario debe crear su contraseña.',
    invite_id: invite.id,
    dev_link: undefined,
  };
}
