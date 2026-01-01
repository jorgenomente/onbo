import Link from 'next/link';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { listGroups } from '@/server/actions/superadmin/listGroups';
import { Button } from '@/components/ui/button';

export default async function SuperadminGroupsPage() {
  await requireSuperAdmin();
  const groupList = await listGroups();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Onbo Superadmin</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona grupos y locales.
          </p>
        </div>
        <Button asChild>
          <Link href="/onbo/groups/new">Crear group</Link>
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Groups</h2>
        {groupList.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {groupList.map((group) => (
              <div key={group.id} className="rounded-lg border p-4 text-sm">
                <div className="font-semibold">{group.name}</div>
                <p className="text-xs text-muted-foreground">{group.slug}</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/onbo/groups/${group.id}`}>Ver detalle</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavia no hay groups creados.
          </p>
        )}
      </section>
    </div>
  );
}
