import Link from 'next/link';

import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';

export default async function LocationDashboardPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  const access = await requireLocationAccess(groupSlug, locationSlug);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{access.location.name}</h1>
        <p className="text-sm text-muted-foreground">
          {access.group.name} · {access.location.slug}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}/courses`}>
            Cursos
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}/members`}>
            Miembros
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}/assignments`}>
            Asignaciones
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}/invites`}>
            Invitaciones
          </Link>
        </Button>
      </div>
    </div>
  );
}
