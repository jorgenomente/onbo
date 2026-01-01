'use client';

import { useState } from 'react';

import { createRecoveryBrowserClient } from '@/lib/supabase/recoveryBrowserClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordForm() {
  const supabase = createRecoveryBrowserClient();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const appUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL ??
          process.env.SITE_URL ??
          'http://localhost:3000';
    const redirectTo = `${appUrl}/auth/setup-password`;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[AUTH][FORGOT] inBrowser',
        typeof window !== 'undefined',
      );
      console.log('[AUTH][FORGOT] pathname', window.location.pathname);
      console.log('[AUTH][FORGOT] submit', {
        email,
        href: window.location.href,
        ua: navigator.userAgent,
      });
      console.log('[AUTH][FORGOT] redirectTo', {
        pathname: new URL(redirectTo).pathname,
      });
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
              name.startsWith('sb-') || name.toLowerCase().includes('supabase'),
          );
        console.log('[AUTH][FORGOT] localStorage keys before', storageKeys);
        console.log('[AUTH][FORGOT] cookie names before', cookieNames);
        if (storageKeys.length === 0) {
          console.log(
            '[AUTH] note: using cookie-based storage, localStorage may be empty',
          );
        }
      } catch {
        // Ignore localStorage failures.
      }
      try {
        localStorage.setItem(
          'auth_reset_initiated_at',
          new Date().toISOString(),
        );
        localStorage.setItem('auth_reset_email', email);
      } catch {
        // Ignore localStorage failures.
      }
    }

    if (!supabase) {
      setError('No se pudo iniciar el flujo de recuperación.');
      setSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH][FORGOT] resetPasswordForEmail done', {
        ok: !resetError,
        error: resetError?.message,
      });
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
              name.startsWith('sb-') || name.toLowerCase().includes('supabase'),
          );
        console.log('[AUTH][FORGOT] localStorage keys after', storageKeys);
        console.log('[AUTH][FORGOT] cookie names after', cookieNames);
        if (storageKeys.length === 0) {
          console.log(
            '[AUTH] note: using cookie-based storage, localStorage may be empty',
          );
        }
      } catch {
        // Ignore localStorage failures.
      }
    }

    if (resetError && process.env.NODE_ENV !== 'production') {
      setError(resetError.message);
    }

    setMessage(
      'Si el email existe, te enviamos un link para restablecer tu contraseña.',
    );
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Enviando…' : 'Enviar link'}
      </Button>
    </form>
  );
}
