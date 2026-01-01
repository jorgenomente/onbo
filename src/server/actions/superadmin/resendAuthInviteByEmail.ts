'use server';

import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const resendSchema = z.object({
  email: z.string().trim().email(),
  redirectTo: z.string().url().optional(),
});

export async function resendAuthInviteByEmail(input: {
  email: string;
  redirectTo?: string;
}) {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  await requireSuperAdmin();

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const supabase = createServiceRoleClient();

  const { data: usersData, error: usersError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] list users', usersError);
    }
    throw new Error('No se pudo buscar el usuario.');
  }

  const targetUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );

  if (!targetUser) {
    throw new Error('Usuario no existe; usar “Invitar nuevo admin”.');
  }

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo =
    parsed.data.redirectTo ?? `${appUrl}/auth/setup-password`;

  const inviteResponse = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo },
  );

  if (inviteResponse.error) {
    if (
      inviteResponse.error.message
        ?.toLowerCase()
        .includes('already been registered')
    ) {
      throw new Error(
        'Este usuario ya tiene cuenta. Usa “Forgot password” si necesita recuperar contraseña.',
      );
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] resend invite', inviteResponse.error);
    }
    throw new Error(
      inviteResponse.error.message ?? 'No se pudo reenviar la invitación.',
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[onbo] invite link', {
      email: normalizedEmail,
      link: inviteResponse.data?.properties?.action_link ?? null,
    });
  }

  return {
    ok: true,
    inviteLink: inviteResponse.data?.properties?.action_link ?? null,
  };
}
