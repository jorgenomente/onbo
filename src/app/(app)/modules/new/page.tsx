import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';

import ModuleCreateForm from './ModuleCreateForm';

export default async function NewModulePage() {
  const profile = await getCurrentProfile();

  if (!profile || !isAdminLike(profile.role)) {
    redirect('/modules');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Nuevo módulo</h1>
        <p className="text-sm text-muted-foreground">
          Creá un módulo para tu plan de onboarding.
        </p>
      </div>

      <ModuleCreateForm />
    </div>
  );
}
