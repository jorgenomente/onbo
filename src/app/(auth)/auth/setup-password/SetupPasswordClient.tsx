'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SetupPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const nextParam = searchParams.get('next');
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/';
  const isInviteFlow = nextPath.includes('/auth/accept-invite?token=');

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const hash = window.location.hash?.startsWith('#')
      ? window.location.hash.slice(1)
      : '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('Faltan tokens en el link. Pedí un nuevo link.');
      setReady(false);
      return;
    }

    (async () => {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(`No se pudo validar la sesión: ${sessionError.message}`);
        setReady(false);
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search,
      );
      setError(null);
      setReady(true);
    })();
  }, [supabase]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.replace(nextPath);
    });
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Link inválido o expirado</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/login')}>Ir a login</Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Validando link…</h1>
        <p className="text-sm text-muted-foreground">Un segundo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Configurar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          {isInviteFlow
            ? 'Estás aceptando una invitación a tu workspace. Cuando confirmes tu contraseña, te vamos a llevar al local.'
            : 'Elegí una nueva contraseña.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
