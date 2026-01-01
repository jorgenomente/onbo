'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { sendPasswordSetupLink } from '@/server/actions/admin/sendPasswordSetupLink';
import { Button } from '@/components/ui/button';

type SendState = {
  ok: boolean;
  message: string | null;
  error: string | null;
};

const initialState: SendState = {
  ok: false,
  message: null,
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

export default function SendPasswordSetupLinkButton({
  email,
  locationId,
}: {
  email: string;
  locationId: string;
}) {
  const [state, formAction] = useActionState(
    sendPasswordSetupLink,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="location_id" value={locationId} />
      <SubmitButton />
      {state.message ? (
        <span className="text-xs text-muted-foreground">{state.message}</span>
      ) : null}
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
