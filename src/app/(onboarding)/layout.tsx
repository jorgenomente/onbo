import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (profile?.org_id) {
    redirect('/dashboard');
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
