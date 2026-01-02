'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const sendSchema = z.object({
  invite_id: z.string().uuid(),
});

export async function sendPasswordSetupLinkAuth(formData: FormData) {
  const parsed = sendSchema.safeParse({
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
    .select('id, email, location_id, status')
    .eq('id', parsed.data.invite_id)
    .maybeSingle();

  if (!invite || invite.status !== 'accepted') {
    throw new Error('Invitacion no disponible.');
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id, group_id')
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

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo = `${appUrl}/auth/setup-password`;

  const adminClient = createServiceRoleClient();
  const { error } = await adminClient.auth.resetPasswordForEmail(
    invite.email,
    { redirectTo },
  );

  if (error) {
    throw new Error(
      error.message ?? 'No se pudo enviar el link de contrasena.',
    );
  }

  return { ok: true };
}
