import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/lib/auth';
import { getMyTenancy } from '@/server/tenancy/getMyTenancy';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[redirect-guard]', { path: '/', reason: 'unauthenticated', dest: '/login' });
    }
    redirect('/login');
  }

  const tenancy = await getMyTenancy();
  let dest = '/home';

  if (tenancy.isSuperAdmin) {
    dest = '/onbo';
  } else if (tenancy.groups.length === 1) {
    dest = `/${tenancy.groups[0].slug}`;
  } else if (tenancy.groups.length > 1) {
    dest = '/select-group';
  } else if (tenancy.locations.length === 1) {
    dest = `/${tenancy.locations[0].groupSlug}/${tenancy.locations[0].slug}`;
  } else if (tenancy.locations.length > 1) {
    dest = '/my-locations';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[redirect-guard]', { path: '/', reason: 'authenticated', dest });
  }
  redirect(dest);
}
