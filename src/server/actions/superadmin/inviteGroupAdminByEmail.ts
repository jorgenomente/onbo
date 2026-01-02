'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const inviteSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function inviteGroupAdminByEmail(input: {
  groupId: string;
  email: string;
}) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const { user } = await requireSuperAdmin();
  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const supabase = createServiceRoleClient();

  const { data: existingInvite } = await supabase
    .from('group_invites')
    .select('id')
    .eq('group_id', parsed.data.groupId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    throw new Error('Ya hay una invitacion pendiente para ese email.');
  }

  const token = randomUUID();
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo = `${appUrl}/auth/setup-password?next=${encodeURIComponent(
    `/auth/accept-invite?token=${token}`,
  )}`;

  const inviteResponse = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo },
  );

  if (inviteResponse.error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] invite group admin', inviteResponse.error);
    }
    if (
      inviteResponse.error.message
        ?.toLowerCase()
        .includes('already been registered')
    ) {
      throw new Error('El usuario ya existe. Asignalo manualmente.');
    }
    throw new Error(
      inviteResponse.error.message ?? 'No se pudo enviar la invitacion.',
    );
  }

  const { error } = await supabase.from('group_invites').insert({
    group_id: parsed.data.groupId,
    email: normalizedEmail,
    role: 'group_admin',
    token,
    status: 'pending',
    invited_by: user.id,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] insert group invite', error);
    }
    throw new Error(error.message ?? 'No se pudo registrar la invitacion.');
  }

  revalidatePath(`/onbo/groups/${parsed.data.groupId}`);

  const inviteLink =
    inviteResponse.data &&
    typeof inviteResponse.data === 'object' &&
    'properties' in inviteResponse.data
      ? (
          inviteResponse.data as { properties?: { action_link?: string } }
        ).properties?.action_link ?? null
      : null;

  return {
    ok: true,
    inviteLink,
  };
}
