import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { isAdminLike, isEmployee } from '@/lib/rbac';
import { logout } from '@/server/actions/logout';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile?.org_id) {
    redirect('/create-org');
  }

  const role = profile?.role;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Onbo
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {role && isAdminLike(role) ? (
              <Link href="/dashboard" className="transition hover:text-foreground">
                Dashboard
              </Link>
            ) : null}
            {role && isAdminLike(role) ? (
              <Link href="/modules" className="transition hover:text-foreground">
                Módulos
              </Link>
            ) : null}
            {role && isEmployee(role) ? (
              <Link href="/home" className="transition hover:text-foreground">
                Home
              </Link>
            ) : null}
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
