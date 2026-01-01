import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getMyTenancy } from '@/server/tenancy/getMyTenancy';
import { Button } from '@/components/ui/button';

export default async function MyLocationsPage() {
  const tenancy = await getMyTenancy();

  if (tenancy.isSuperAdmin) {
    redirect('/onbo');
  }

  if (tenancy.locations.length === 1) {
    redirect(
      `/${tenancy.locations[0].groupSlug}/${tenancy.locations[0].slug}`,
    );
  }

  if (tenancy.locations.length === 0) {
    redirect('/home');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Selecciona un local</h1>
        <p className="text-sm text-muted-foreground">
          Tenés acceso a múltiples locales.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tenancy.locations.map((location) => (
          <div key={location.id} className="rounded-lg border p-4 text-sm">
            <div className="font-semibold">{location.slug}</div>
            <p className="text-xs text-muted-foreground">
              {location.groupSlug}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/${location.groupSlug}/${location.slug}`}>
                Abrir local
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
