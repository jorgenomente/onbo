import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { Button } from '@/components/ui/button';
import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { type Role } from '@/lib/rbac';
import { logout } from '@/server/actions/logout';
import { getMyTenancy } from '@/server/tenancy/getMyTenancy';
import TopNavLinks from '@/components/navigation/TopNavLinks';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const headerList = headers();
  const getHeader = (key: string) => {
    if (headerList && typeof (headerList as Headers).get === 'function') {
      return (headerList as Headers).get(key);
    }
    return (headerList as Record<string, string | undefined>)?.[key] ?? null;
  };
  const rawPath =
    getHeader('x-invoke-path') ??
    getHeader('x-matched-path') ??
    getHeader('next-url') ??
    '';
  const pathname = rawPath
    ? rawPath.startsWith('http')
      ? new URL(rawPath).pathname
      : rawPath.split('?')[0]
    : '';
  const rootSegment = pathname.split('/').filter(Boolean)[0] ?? '';
  const legacyGuardRoots = new Set([
    'admin',
    'assignments',
    'courses',
    'dashboard',
    'home',
    'modules',
    'my-locations',
    'resources',
    'select-group',
    'settings',
  ]);
  const shouldEnforceOrgGuard = legacyGuardRoots.has(rootSegment);

  const profile = await getCurrentProfile();
  if (shouldEnforceOrgGuard && !profile?.org_id) {
    const tenancy = await getMyTenancy();
    const hasMemberships =
      tenancy.isSuperAdmin ||
      tenancy.groups.length > 0 ||
      tenancy.locations.length > 0;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[redirect-guard]', {
        reason: 'missing_profile',
        dest: '/no-access',
        pathname,
        memberships: hasMemberships,
      });
    }
    if (!hasMemberships) {
      redirect('/no-access');
    }
  }

  const role = (profile?.role ?? null) as Role | null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Onbo
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <TopNavLinks role={role} />
            <div className="flex flex-col items-end text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {profile?.full_name ?? user.email ?? 'Usuario'}
              </span>
              {profile?.full_name && user.email ? (
                <span>{user.email}</span>
              ) : null}
            </div>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Logout
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
