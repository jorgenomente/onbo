'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createRecoveryBrowserClient } from '@/lib/supabase/recoveryBrowserClient';
import { acceptInviteWithId } from '@/server/actions/invites/acceptInvite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createRecoveryBrowserClient(), []);

  const inviteId =
    searchParams.get('inviteId') ?? searchParams.get('invite_id');
  const nextParam = searchParams.get('next');
  const safeNext =
    nextParam && nextParam.startsWith('/') ? nextParam : '/home';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      try {
        if (!supabase) {
          throw new Error('No se pudo iniciar la sesión.');
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        if (process.env.NODE_ENV !== 'production') {
          const queryKeys = Array.from(url.searchParams.keys());
          const tokenHash = url.searchParams.get('token_hash');
          const typeParam = url.searchParams.get('type');
          console.log('[AUTH][SETUP] query keys', queryKeys);
          console.log('[AUTH][SETUP] hash keys', Array.from(hashParams.keys()));
          console.log('[AUTH][SETUP] hasCode', Boolean(url.searchParams.get('code')));
          console.log('[AUTH][SETUP] hasTokenHash', Boolean(tokenHash));
          console.log('[AUTH][SETUP] type', typeParam);
          try {
            const storageKeys = Object.keys(localStorage).filter(
              (key) =>
                key.startsWith('sb-') ||
                key.includes('supabase') ||
                key.includes('verifier'),
            );
            const cookieNames = document.cookie
              .split(';')
              .map((entry) => entry.trim().split('=')[0])
              .filter(
                (name) =>
                  name.startsWith('sb-') ||
                  name.toLowerCase().includes('supabase'),
              );
            console.log('[AUTH][SETUP] storage snapshot', {
              lsKeys: storageKeys,
              cookieNames,
            });
            if (storageKeys.length === 0) {
              console.log(
                '[AUTH] note: using cookie-based storage, localStorage may be empty',
              );
            }
          } catch {
            // Ignore localStorage failures.
          }
        }
        if (!code) {
          throw new Error('Link inválido o expirado.');
        }

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[AUTH][SETUP] exchange result', {
            ok: !exchangeError,
            error: exchangeError?.message,
          });
        }
        if (exchangeError) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw exchangeError;
          }
        }
        const { data: userData } = await supabase.auth.getUser();
        if (active) {
          setEmail(userData.user?.email ?? null);
        }
        if (active) setSessionReady(true);
        if (window.location.hash) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search,
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
          );
        }
      }
    }

    hydrateSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    if (inviteId) {
      const result = await acceptInviteWithId(inviteId);
      if (!result.ok) {
        const message =
          result.error === 'not_pending'
            ? 'Invitación ya usada o revocada.'
            : result.error === 'email_mismatch'
              ? 'Esta invitación no corresponde a tu email.'
              : result.error === 'profile_upsert_failed'
                ? 'No pudimos crear tu acceso. Contactá al admin.'
                : result.error === 'invite_update_failed'
                  ? 'Se creó tu acceso pero falló confirmar la invitación.'
                  : 'Invitación no encontrada.';
        setSubmitting(false);
        setError(message);
        return;
      }
    }

    router.replace(safeNext);
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Link inválido o expirado</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Pedir un nuevo link</Link>
        </Button>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Validando sesión…</h1>
        <p className="text-sm text-muted-foreground">
          Estamos preparando tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Crear contraseña</h1>
        <p className="text-sm text-muted-foreground">
          {inviteId
            ? 'Creá tu contraseña y uníte al workspace.'
            : 'Elegí una nueva contraseña.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email ?? ''}
            readOnly
            autoComplete="username"
            placeholder="tu@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar contraseña</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
