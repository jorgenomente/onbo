import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile || !profile.org_id) redirect('/create-org');
  if (profile.role === 'employee') redirect('/home');

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="text-sm text-muted-foreground">
        <p>Email: {user.email}</p>
        <p>Role: {profile.role}</p>
        <p>Org ID: {profile.org_id}</p>
      </div>
    </div>
  );
}
