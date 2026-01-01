import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getMyTenancy } from '@/server/tenancy/getMyTenancy';
import { Button } from '@/components/ui/button';

export default async function SelectGroupPage() {
  const tenancy = await getMyTenancy();

  if (tenancy.isSuperAdmin) {
    redirect('/onbo');
  }

  if (tenancy.groups.length === 1) {
    redirect(`/${tenancy.groups[0].slug}`);
  }

  if (tenancy.groups.length === 0) {
    redirect('/home');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Selecciona un grupo</h1>
        <p className="text-sm text-muted-foreground">
          Tenés acceso a varios grupos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tenancy.groups.map((group) => (
          <div key={group.id} className="rounded-lg border p-4 text-sm">
            <div className="font-semibold">{group.name}</div>
            <p className="text-xs text-muted-foreground">{group.slug}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/${group.slug}`}>Abrir grupo</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
