import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function generateMagicLink(email: string, redirectTo?: string) {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) {
    return { link: null, userId: null, error };
  }

  return {
    link: data?.properties?.action_link ?? null,
    userId: data?.user?.id ?? null,
    error: null,
  };
}
