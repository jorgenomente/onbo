'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

type SendPasswordSetupState = {
  ok: boolean;
  message: string | null;
  error: string | null;
};

const sendSchema = z.object({
  email: z.string().trim().email(),
  locationId: z.string().uuid(),
});

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000'
  );
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_SENDER;
  if (!apiKey || !sender) {
    return null;
  }
  return { apiKey, sender };
}

export async function sendPasswordSetupLink(
  _prevState: SendPasswordSetupState,
  formData: FormData,
): Promise<SendPasswordSetupState> {
  const parsed = sendSchema.safeParse({
    email: formData.get('email'),
    locationId: formData.get('location_id'),
  });

  if (!parsed.success) {
    return { ok: false, message: null, error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: null, error: 'No autorizado.' };
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id, group_id, name')
    .eq('id', parsed.data.locationId)
    .maybeSingle();

  if (!location) {
    return { ok: false, message: null, error: 'Local no encontrado.' };
  }

  const { data: groupMembership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', location.group_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: locationMembership } = await supabase
    .from('location_memberships')
    .select('role')
    .eq('location_id', location.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isGroupAdmin = groupMembership?.role === 'group_admin';
  const isLocationManager =
    locationMembership?.role === 'location_admin' ||
    locationMembership?.role === 'trainer';

  if (!isGroupAdmin && !isLocationManager) {
    return { ok: false, message: null, error: 'No autorizado.' };
  }

  const adminClient = createServiceRoleClient();
  const appUrl = getAppUrl();
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: parsed.data.email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
          '/auth/setup-password',
        )}`,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    return {
      ok: false,
      message: null,
      error: linkError?.message ?? 'No se pudo generar el link.',
    };
  }

  const resendConfig = getResendConfig();

  if (!resendConfig) {
    const inviteRedirectTo = `${appUrl}/auth/setup-password`;
    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
        redirectTo: inviteRedirectTo,
      });

    if (inviteError) {
      return {
        ok: false,
        message: null,
        error: inviteError.message,
      };
    }

    return {
      ok: true,
      message: 'Invitación enviada vía Supabase.',
      error: null,
    };
  }

  try {
    const { apiKey, sender } = resendConfig;
    const subject = 'Configura tu contraseña';
    const actionLink = linkData.properties.action_link;
    const html = `
      <p>Te enviamos este link para configurar tu contraseña:</p>
      <p><a href="${actionLink}">Configurar contraseña</a></p>
      <p>Si no solicitaste esto, ignorá este mensaje.</p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: parsed.data.email,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        message: null,
        error: `No se pudo enviar el email. ${body}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: null,
      error: err instanceof Error ? err.message : 'No se pudo enviar el email.',
    };
  }

  return {
    ok: true,
    message: 'Link enviado.',
    error: null,
  };
}
