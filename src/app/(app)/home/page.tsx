import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getMyTenancy } from '@/server/tenancy/getMyTenancy';

export default async function HomePage() {
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
  redirect('/no-access');
}
