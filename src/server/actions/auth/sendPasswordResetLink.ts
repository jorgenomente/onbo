'use server';

import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const resetSchema = z.object({
  user_id: z.string().uuid(),
});

type SendPasswordResetState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

export async function sendPasswordResetLink(
  _prevState: SendPasswordResetState,
  formData: FormData,
): Promise<SendPasswordResetState> {
  const parsed = resetSchema.safeParse({
    user_id: formData.get('user_id'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Usuario inválido.', message: null };
  }

  const profile = await getCurrentProfile();
  if (!profile || !isAdminLike(profile.role)) {
    return { ok: false, error: 'No autorizado.', message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: member, error: memberError } = await supabase
    .from('profiles')
    .select('user_id, org_id, email')
    .eq('user_id', parsed.data.user_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (memberError || !member) {
    return { ok: false, error: 'Miembro no encontrado.', message: null };
  }

  if (!member.email) {
    return { ok: false, error: 'Miembro sin email.', message: null };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!appUrl) {
    return { ok: false, error: 'Falta configurar NEXT_PUBLIC_APP_URL.', message: null };
  }

  const adminClient = createSupabaseAdminClient();
  const redirectTo = `${appUrl}/auth/set-password`;
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(
    member.email,
    { redirectTo },
  );

  if (resetError) {
    return { ok: false, error: resetError.message, message: null };
  }

  return {
    ok: true,
    error: null,
    message: 'Link enviado.',
  };
}
