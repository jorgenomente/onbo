'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { acceptInvite } from '@/server/actions/invites/acceptInvite';

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const inviteId =
    searchParams.get('inviteId') ?? searchParams.get('invite_id');
  const error = searchParams.get('error');
  const debugId = searchParams.get('debugId');

  useEffect(() => {
    console.log('[acceptInvitePage] inviteId', inviteId);
  }, [inviteId]);

  const errorMessage =
    error === 'unauthenticated'
      ? 'Iniciá sesión para aceptar la invitación.'
      : error === 'bad_invite_id'
        ? 'Link de invitación inválido.'
        : error === 'not_found'
          ? 'Invitación no encontrada.'
          : error === 'not_pending'
            ? 'Invitación ya usada o revocada.'
            : error === 'email_mismatch'
              ? 'Esta invitación no corresponde a tu email.'
              : error === 'profile_upsert_failed'
                ? 'No pudimos crear tu acceso. Contactá al admin.'
                : error === 'invite_update_failed'
                  ? 'Se creó tu acceso pero falló confirmar la invitación. Contactá al admin.'
                  : null;

  if (!inviteId) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Invitación inválida</h1>
        <p className="text-sm text-muted-foreground">
          Falta inviteId en URL.
        </p>
        {process.env.NODE_ENV !== 'production' ? (
          <p className="text-xs text-muted-foreground">
            debug inviteId: {inviteId ?? 'null'}
            {debugId ? ` · debugId: ${debugId}` : ''}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Ir a login
          </Link>
          <Link
            href="/home"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium text-foreground"
          >
            Ir a home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Aceptar invitación</h1>
      <p className="text-sm text-muted-foreground">
        Confirmá para unirte al workspace.
      </p>
      {process.env.NODE_ENV !== 'production' ? (
        <p className="text-xs text-muted-foreground">
          debug inviteId: {inviteId}
          {debugId ? ` · debugId: ${debugId}` : ''}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
      <form action={acceptInvite} className="space-y-2">
        <input type="hidden" name="invite_id" value={inviteId} />
        <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Continuar
        </button>
      </form>
      <div className="flex flex-col gap-2">
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium text-foreground"
        >
          Ir a login
        </Link>
        <Link
          href="/home"
          className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium text-foreground"
        >
          Ir a home
        </Link>
      </div>
    </div>
  );
}
