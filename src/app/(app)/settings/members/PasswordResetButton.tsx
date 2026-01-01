'use client';

import { useActionState } from 'react';

import { sendPasswordResetLink } from '@/server/actions/auth/sendPasswordResetLink';
import { Button } from '@/components/ui/button';

type PasswordResetButtonProps = {
  userId: string;
  email: string | null;
};

const initialState = {
  ok: false,
  error: null as string | null,
  message: null as string | null,
};

export default function PasswordResetButton({
  userId,
  email,
}: PasswordResetButtonProps) {
  const [state, formAction, isPending] = useActionState(
    sendPasswordResetLink,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? 'Enviando…' : 'Enviar link de contraseña'}
      </Button>
      {email ? null : (
        <span className="text-xs text-muted-foreground">
          Email no disponible
        </span>
      )}
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
      {state.message ? (
        <span className="text-xs text-muted-foreground">{state.message}</span>
      ) : null}
    </form>
  );
}
