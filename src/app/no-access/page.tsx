import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';
import { getMyTenancy } from '@/server/tenancy/getMyTenancy';

import NoAccessActions from './NoAccessActions';

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  const isDev = process.env.NODE_ENV !== 'production';
  let tenancy = null as null | { groups: unknown[]; locations: unknown[] };
  let tenancyError: string | null = null;

  if (isDev) {
    try {
      const data = await getMyTenancy();
      tenancy = { groups: data.groups, locations: data.locations };
    } catch (err) {
      tenancyError =
        err instanceof Error ? err.message : 'No se pudo cargar tenancy.';
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Acceso restringido</h1>
      <p className="text-sm text-muted-foreground">
        Tu usuario no pertenece a ningun workspace. Pedi al admin que te invite.
      </p>
      {user?.email ? (
        <p className="text-sm text-muted-foreground">Email: {user.email}</p>
      ) : null}
      {isDev ? (
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p>User: {user?.email ?? 'NO SESSION'}</p>
          <p>
            Groups: {tenancy?.groups.length ?? 0} · Locations:{' '}
            {tenancy?.locations.length ?? 0}
          </p>
          {tenancyError ? <p>Error: {tenancyError}</p> : null}
        </div>
      ) : null}
      {user ? (
        <NoAccessActions />
      ) : (
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Ir a login
        </Link>
      )}
    </div>
  );
}
