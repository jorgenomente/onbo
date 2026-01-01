'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) {
        return;
      }
      setHasSession(Boolean(data.session));
      setSessionReady(true);
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.replace('/home');
    }, 800);
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

  if (!hasSession) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Sesión requerida</h1>
        <p className="text-sm text-muted-foreground">
          Abrí el link del email para continuar o iniciá sesión.
        </p>
        <Button onClick={() => router.replace('/login')}>Ir a login</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Actualizar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Elegí una nueva contraseña para tu cuenta.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-600">
            Contraseña actualizada. Redirigiendo…
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
