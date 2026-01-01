import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { getMyTenancy } from '@/server/tenancy/getMyTenancy';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenancy = await getMyTenancy();
  if (tenancy.isSuperAdmin) {
    redirect('/onbo');
  }
  if (tenancy.groups.length === 1) {
    redirect(`/${tenancy.groups[0].slug}`);
  }
  if (tenancy.groups.length > 1) {
    redirect('/select-group');
  }
  if (tenancy.locations.length === 1) {
    redirect(
      `/${tenancy.locations[0].groupSlug}/${tenancy.locations[0].slug}`,
    );
  }
  if (tenancy.locations.length > 1) {
    redirect('/my-locations');
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.org_id) redirect('/no-access');
  if (profile.role === 'employee') redirect('/home');

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        No tenés accesos del nuevo modelo asignados todavía.
      </p>
    </div>
  );
}
