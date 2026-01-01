import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireGroupAccess } from '@/server/tenancy/requireGroupAccess';
import LocationForm from './location-form';

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const access = await requireGroupAccess(groupSlug);
  const canManageLocations = access.isGroupAdmin || access.isSuperAdmin;

  const supabase = access.isSuperAdmin
    ? createServiceRoleClient()
    : await createSupabaseServerClient();

  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name, slug, created_at')
    .eq('group_id', access.group.id)
    .order('created_at', { ascending: true });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[group] locations data', locations);
    console.log('[group] locations error', locationsError);
  }

  const hasLocationsError =
    !!locationsError &&
    (typeof locationsError.message === 'string' &&
    locationsError.message.trim().length > 0
      ? true
      : Object.keys(locationsError).length > 0);

  if (hasLocationsError) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{access.group.name}</h1>
          <pre className="rounded-lg border p-3 text-xs">
            {JSON.stringify(locationsError, null, 2)}
          </pre>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">{access.group.name}</h1>
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar locales.
        </p>
      </div>
    );
  }

  const locationList = locations ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{access.group.name}</h1>
        <p className="text-sm text-muted-foreground">{access.group.slug}</p>
      </header>

      {canManageLocations ? (
        <LocationForm groupId={access.group.id} groupSlug={access.group.slug} />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Locales</h2>
        {locationList.length ? (
          <div className="space-y-2 text-sm">
            {locationList.map((location) => (
              <Link
                key={location.id}
                href={`/${access.group.slug}/${location.slug}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 transition hover:border-muted-foreground/30"
              >
                <span className="font-medium">{location.name}</span>
                <span className="text-xs text-muted-foreground">
                  {location.slug}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay locales todavia.
          </p>
        )}
      </section>
    </div>
  );
}
