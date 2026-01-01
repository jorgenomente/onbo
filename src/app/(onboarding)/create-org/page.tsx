import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';

import CreateOrgForm from './CreateOrgForm';

export default async function CreateOrgPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile) redirect('/no-access');
  if (!isAdminLike(profile.role)) redirect('/home');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Crear organización</h1>
        <p className="text-sm text-muted-foreground">
          Definí el nombre de tu workspace para empezar a trabajar.
        </p>
      </div>

      <CreateOrgForm />
    </div>
  );
}
