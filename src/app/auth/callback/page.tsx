'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const rawNext = searchParams.get('next');
      const nextPath =
        rawNext && rawNext.startsWith('/') ? rawNext : '/auth/setup-password';
      const code = searchParams.get('code');

      if (process.env.NODE_ENV !== 'production') {
        const queryKeys = Array.from(searchParams.keys());
        console.log('[AUTH][CALLBACK] query keys', queryKeys);
        console.log('[AUTH][CALLBACK] has code', Boolean(code));
        console.log('[AUTH][CALLBACK] pathname', window.location.pathname);
      }

      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          if (active) {
            router.replace(nextPath);
          }
          return;
        }

        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[AUTH][CALLBACK] hash keys',
            Array.from(params.keys()),
          );
        }
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          throw new Error('No encontramos tokens de sesión en el link.');
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        if (active) {
          router.replace(nextPath);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo completar la autenticación.',
          );
          setLoading(false);
        }
      }
    }

    handleCallback();
    return () => {
      active = false;
    };
  }, [router, searchParams, supabase]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">No se pudo validar sesión</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.replace('/login')}>Ir a login</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Validando sesión…</h1>
        <p className="text-sm text-muted-foreground">
          Estamos preparando tu acceso.
        </p>
      </div>
    );
  }

  return null;
}
