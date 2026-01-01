import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import GroupForm from '../../group-form';

export default async function SuperadminNewGroupPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Crear group</h1>
          <p className="text-sm text-muted-foreground">
            Usa el slug para generar la ruta base.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/onbo">Volver</Link>
        </Button>
      </header>

      <GroupForm />
    </div>
  );
}
