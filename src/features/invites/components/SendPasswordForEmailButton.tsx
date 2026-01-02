"use client";

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { sendPasswordSetupLinkForEmail } from '@/features/invites/actions';

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

export default function SendPasswordForEmailButton({
  email,
  locationId,
  helper,
}: {
  email: string;
  locationId: string;
  helper?: string;
}) {
  const [state, formAction] = React.useActionState(
    async (_prevState: SendState, formData: FormData) => {
      try {
        await sendPasswordSetupLinkForEmail(formData);
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
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="email" value={email} />
      <SubmitButton />
      {state.ok ? (
        <span className="text-xs text-emerald-600">Enviado</span>
      ) : null}
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
      {helper ? (
        <span className="text-xs text-muted-foreground">{helper}</span>
      ) : null}
    </form>
  );
}
