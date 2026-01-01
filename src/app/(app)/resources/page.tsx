import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import ResourceCard from '@/components/resources/ResourceCard';
import { getOrgResources } from '@/server/queries/resources/getOrgResources';

export default async function ResourcesPage() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.org_id) {
    redirect('/login');
  }

  const resources = await getOrgResources(profile.org_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Materiales utiles de la empresa.
        </p>
      </div>

      {resources.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay recursos.</p>
      )}
    </div>
  );
}
