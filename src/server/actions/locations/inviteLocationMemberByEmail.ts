'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const inviteSchema = z.object({
  locationId: z.string().uuid(),
  email: z.string().trim().email(),
  role: z.enum(['trainer', 'employee']),
});

export async function inviteLocationMemberByEmail(input: {
  locationId: string;
  email: string;
  role: 'trainer' | 'employee';
}) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const { data: locationRow } = await supabase
    .from('locations')
    .select('id, group_id')
    .eq('id', parsed.data.locationId)
    .maybeSingle();

  if (!locationRow) {
    throw new Error('Local no encontrado o sin acceso.');
  }

  const { data: groupAdminMembership } = await supabase
    .from('group_memberships')
    .select('role, group_id')
    .eq('user_id', user.id)
    .eq('role', 'group_admin')
    .eq('group_id', locationRow.group_id)
    .maybeSingle();

  const { data: locationMembership } = await supabase
    .from('location_memberships')
    .select('role')
    .eq('location_id', parsed.data.locationId)
    .eq('user_id', user.id)
    .maybeSingle();

  const isLocationAdmin =
    locationMembership?.role === 'location_admin' ||
    locationMembership?.role === 'trainer';

  if (!groupAdminMembership && !isLocationAdmin) {
    throw new Error('No autorizado.');
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const adminClient = createServiceRoleClient();

  const { data: existingInvite } = await adminClient
    .from('location_invites')
    .select('id')
    .eq('location_id', parsed.data.locationId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    throw new Error('Ya hay una invitación pendiente para ese email.');
  }

  const { data: usersData } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  const existingUser = usersData.users.find(
    (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
  );

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo = `${appUrl}/auth/setup-password`;

  if (existingUser) {
    await adminClient.from('location_memberships').upsert(
      {
        location_id: parsed.data.locationId,
        user_id: existingUser.id,
        role: parsed.data.role,
      },
      { onConflict: 'location_id,user_id' },
    );

    if (redirectTo) {
      const { error } = await adminClient.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[locations] reset password', error);
        }
        throw new Error(
          error.message ??
            'No se pudo enviar el email de recuperación.',
        );
      }
    }

    return { ok: true, mode: 'assigned_existing' as const };
  }

  const token = randomUUID();
  const inviteRedirect = `${appUrl}/auth/setup-password?next=${encodeURIComponent(
    `/auth/accept-invite?token=${token}`,
  )}`;

  if (!inviteRedirect) {
    throw new Error('APP_URL no configurado.');
  }

  const { error: insertError } = await adminClient.from('location_invites').insert({
    location_id: parsed.data.locationId,
    email: normalizedEmail,
    role: parsed.data.role,
    token,
    status: 'pending',
    invited_by: user.id,
  });

  if (insertError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[locations] insert invite', insertError);
    }
    throw new Error(insertError.message ?? 'No se pudo registrar la invitación.');
  }

  const inviteResponse = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo: inviteRedirect },
  );

  if (inviteResponse.error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[locations] invite user', inviteResponse.error);
    }
    throw new Error(
      inviteResponse.error.message ?? 'No se pudo enviar la invitación.',
    );
  }

  const inviteLink =
    inviteResponse.data &&
    typeof inviteResponse.data === 'object' &&
    'properties' in inviteResponse.data
      ? (
          inviteResponse.data as { properties?: { action_link?: string } }
        ).properties?.action_link ?? null
      : null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[locations] invite link', {
      email: normalizedEmail,
      link: inviteLink,
    });
  }

  return {
    ok: true,
    mode: 'invited' as const,
    inviteLink,
  };
}
