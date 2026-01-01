import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { acceptGroupLocationInvite } from '@/server/actions/invites/acceptGroupLocationInvite';

import AcceptInviteClient from './AcceptInviteClient';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = searchParams ? await searchParams : {};
  const tokenRaw = Array.isArray(sp.token) ? sp.token[0] : sp.token;

  if (tokenRaw) {
    if (!user) {
      return (
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
          <h1 className="text-2xl font-semibold">No hay sesión</h1>
          <p className="text-sm text-muted-foreground">
            Iniciá sesión desde el link del email para completar la invitación.
          </p>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Ir a login
          </Link>
        </div>
      );
    }

    const result = await acceptGroupLocationInvite(tokenRaw);
    if (result.ok && result.redirectTo) {
      redirect(result.redirectTo);
    }

    const errorMessage =
      result.error === 'email_mismatch'
        ? 'Esta invitación corresponde a otro email.'
        : result.error === 'unauthenticated'
          ? 'Iniciá sesión para aceptar la invitación.'
          : 'Invitación inválida o ya fue usada.';

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Invitación inválida</h1>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Ir a login
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">No hay sesión</h1>
        <p className="text-sm text-muted-foreground">
          El link puede haber expirado o ya fue usado. Pedí un link nuevo.
        </p>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Ir a login
        </Link>
      </div>
    );
  }

  return <AcceptInviteClient />;
}
