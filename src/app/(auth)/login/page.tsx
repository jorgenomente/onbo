import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';

import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const nextPath = sp.next;
  const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : undefined;
  const user = await getCurrentUser();
  if (user) redirect(safeNext ?? '/home');

  return <LoginForm nextPath={safeNext} />;
}
