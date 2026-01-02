"use client";

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { sendPasswordSetupLinkAuth } from '@/features/invites/actions';

type SendState = {
  ok: boolean;
  error: string | null;
};

const initialState: SendState = {
  ok: false,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? 'Enviando...' : 'Enviar link de contraseña'}
    </Button>
  );
}

export default function SendPasswordSetupButton({
  inviteId,
}: {
  inviteId: string;
}) {
  const [state, formAction] = React.useActionState(
    async (prevState: SendState, formData: FormData) => {
      try {
        await sendPasswordSetupLinkAuth(formData);
        return { ok: true, error: null };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo enviar el link.';
        return { ok: false, error: message };
      }
    },
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="invite_id" value={inviteId} />
      <SubmitButton />
      {state.ok ? (
        <span className="ml-2 text-xs text-emerald-600">Enviado</span>
      ) : null}
      {state.error ? (
        <span className="ml-2 text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
