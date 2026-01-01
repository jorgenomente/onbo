'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const requestMagicLinkSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

type RequestMagicLinkState = {
  ok: boolean;
  error: string | null;
};

export async function requestMagicLink(
  _prevState: RequestMagicLinkState,
  formData: FormData,
): Promise<RequestMagicLinkState> {
  const parsed = requestMagicLinkSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Email inválido.' };
  }

  const nextPath =
    parsed.data.next && parsed.data.next.startsWith('/')
      ? parsed.data.next
      : '/home';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (!appUrl) {
    return { ok: false, error: 'Falta configurar NEXT_PUBLIC_APP_URL.' };
  }

  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
