'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const resendSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  redirectTo: z.string().url().optional(),
});

export async function resendInviteByUserId(input: {
  groupId: string;
  userId: string;
  redirectTo?: string;
}) {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const { user: superadmin } = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('email')
    .eq('group_id', parsed.data.groupId)
    .eq('user_id', parsed.data.userId)
    .maybeSingle();

  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(parsed.data.userId);

  if (userError && process.env.NODE_ENV !== 'production') {
    console.error('[onbo] get user by id', userError);
  }

  const emailFromAuth = userData.user?.email?.toLowerCase().trim() ?? null;
  const fallbackEmail = membership?.email?.toLowerCase().trim() ?? null;
  const email = emailFromAuth ?? fallbackEmail;

  if (!email) {
    throw new Error('Email no disponible.');
  }

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo =
    parsed.data.redirectTo ?? `${appUrl}/auth/setup-password`;

  if (emailFromAuth) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[onbo] reset password', error);
      }
      throw new Error(
        error.message ??
          'No se pudo reenviar la invitación. Verifica el proveedor de email.',
      );
    }

    return { ok: true, email, mode: 'reset' };
  }

  const token = randomUUID();
  const inviteRedirect = `${appUrl}/auth/setup-password?next=${encodeURIComponent(
    `/auth/accept-invite?token=${token}`,
  )}`;

  if (!inviteRedirect) {
    throw new Error('APP_URL no configurado.');
  }

  const { data: pendingInvite } = await supabase
    .from('group_invites')
    .select('id')
    .eq('group_id', parsed.data.groupId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInvite) {
    await supabase
      .from('group_invites')
      .update({ token, invited_by: superadmin.id })
      .eq('id', pendingInvite.id);
  } else {
    const { error } = await supabase.from('group_invites').insert({
      group_id: parsed.data.groupId,
      email,
      role: 'group_admin',
      token,
      status: 'pending',
      invited_by: superadmin.id,
    });

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[onbo] insert group invite', error);
      }
      throw new Error(error.message ?? 'No se pudo registrar la invitación.');
    }
  }

  const inviteResponse = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirect,
  });

  if (inviteResponse.error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] invite user by email', inviteResponse.error);
    }
    throw new Error(
      inviteResponse.error.message ?? 'No se pudo enviar la invitación.',
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[onbo] invite link', {
      email,
      link: inviteResponse.data?.properties?.action_link ?? null,
    });
  }

  return {
    ok: true,
    email,
    mode: 'invite',
    inviteLink: inviteResponse.data?.properties?.action_link ?? null,
  };
}
