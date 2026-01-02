'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000'
  );
}

const resendSchema = z.object({
  invite_id: z.string().uuid(),
});

export async function resendLocationInvite(formData: FormData) {
  const parsed = resendSchema.safeParse({
    invite_id: formData.get('invite_id'),
  });

  if (!parsed.success) {
    throw new Error('Invitacion invalida.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const { data: invite } = await supabase
    .from('location_invites')
    .select('id, email, location_id, status, token')
    .eq('id', parsed.data.invite_id)
    .maybeSingle();

  if (!invite || invite.status !== 'pending') {
    throw new Error('Invitacion no disponible.');
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id, group_id, slug')
    .eq('id', invite.location_id)
    .maybeSingle();

  if (!location) {
    throw new Error('Local no encontrado.');
  }

  const { data: groupAdmin } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', location.group_id)
    .eq('user_id', user.id)
    .eq('role', 'group_admin')
    .maybeSingle();

  const { data: locationMembership } = await supabase
    .from('location_memberships')
    .select('role')
    .eq('location_id', invite.location_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const canManage =
    !!groupAdmin ||
    locationMembership?.role === 'location_admin' ||
    locationMembership?.role === 'trainer';

  if (!canManage) {
    throw new Error('No autorizado.');
  }

  const adminClient = createServiceRoleClient();
  const appUrl = getAppUrl();
  const token = randomUUID();
  const inviteRedirect = `${appUrl}/auth/setup-password?next=${encodeURIComponent(
    `/auth/accept-invite?token=${token}`,
  )}`;

  const { error: updateError } = await adminClient
    .from('location_invites')
    .update({ token, status: 'pending' })
    .eq('id', invite.id);

  if (updateError) {
    throw new Error(updateError.message ?? 'No se pudo actualizar la invitacion.');
  }

  const normalizedEmail = invite.email.toLowerCase().trim();
  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = usersData.users.find(
    (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
  );

  if (!existingUser) {
    const inviteResponse = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo: inviteRedirect },
    );
    if (inviteResponse.error) {
      throw new Error(
        inviteResponse.error.message ?? 'No se pudo reenviar la invitacion.',
      );
    }
  } else {
    const { error: resetError } =
      await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: inviteRedirect,
      });

    if (resetError) {
      throw new Error(
        resetError.message ?? 'No se pudo reenviar la invitacion.',
      );
    }
  }

  const { data: group } = await adminClient
    .from('groups')
    .select('id, slug')
    .eq('id', location.group_id)
    .maybeSingle();

  if (group) {
    const basePath = `/${group.slug}/${location.slug}`;
    revalidatePath(`${basePath}/invites`);
    revalidatePath(`${basePath}/members`);
  }
}
