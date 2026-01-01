'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { isAdminLike, isEmployee, type Role } from '@/lib/rbac';

type TopNavLinksProps = {
  role: Role | null;
};

const RESERVED_ROOTS = new Set([
  'admin',
  'assignments',
  'auth',
  'courses',
  'create-org',
  'dashboard',
  'home',
  'login',
  'modules',
  'my-locations',
  'no-access',
  'onbo',
  'resources',
  'select-group',
  'settings',
  'update-password',
]);

export default function TopNavLinks({ role }: TopNavLinksProps) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0] ?? '';

  if (pathname.startsWith('/onbo')) {
    return (
      <>
        <Link href="/onbo" className="transition hover:text-foreground">
          Groups
        </Link>
        <Link href="/onbo/debug" className="transition hover:text-foreground">
          Debug
        </Link>
      </>
    );
  }

  if (root && !RESERVED_ROOTS.has(root)) {
    if (segments.length === 1) {
      const groupSlug = root;
      return (
        <>
          <Link href={`/${groupSlug}`} className="transition hover:text-foreground">
            Locales
          </Link>
          <Link
            href={`/${groupSlug}/members`}
            className="transition hover:text-foreground"
          >
            Miembros
          </Link>
        </>
      );
    }

    if (segments.length >= 2) {
      const groupSlug = root;
      const locationSlug = segments[1];
      const basePath = `/${groupSlug}/${locationSlug}`;
      return (
        <>
          <Link href={`${basePath}/courses`} className="transition hover:text-foreground">
            Cursos
          </Link>
          <Link href={`${basePath}/members`} className="transition hover:text-foreground">
            Miembros
          </Link>
          <Link href={`${basePath}/invites`} className="transition hover:text-foreground">
            Invitaciones
          </Link>
        </>
      );
    }
  }

  return (
    <>
      {role && isAdminLike(role) ? (
        <Link href="/dashboard" className="transition hover:text-foreground">
          Dashboard
        </Link>
      ) : null}
      <Link
        href={role && isAdminLike(role) ? '/admin/courses' : '/home'}
        className="transition hover:text-foreground"
      >
        Cursos
      </Link>
      {role && isAdminLike(role) ? (
        <Link href="/settings/members" className="transition hover:text-foreground">
          Miembros
        </Link>
      ) : null}
      {role && isEmployee(role) ? (
        <Link href="/home" className="transition hover:text-foreground">
          Home
        </Link>
      ) : null}
    </>
  );
}
