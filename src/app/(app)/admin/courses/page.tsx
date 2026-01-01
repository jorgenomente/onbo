import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { listModulesForAdmin } from '@/server/queries/modules/listModulesForAdmin';

import CourseCreateForm from './CourseCreateForm';

export default async function CoursesPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  if (!profile.org_id) {
    redirect('/home');
  }

  const modules = await listModulesForAdmin(profile.org_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Cursos</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná cursos y su configuración.
        </p>
      </div>

      <CourseCreateForm />

      <div className="space-y-2">
        {modules.length ? (
          modules.map((module) => (
            <Link
              key={module.id}
              href={`/admin/courses/${module.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition hover:bg-muted"
            >
              <span className="font-medium">{module.title}</span>
              <span className="text-xs text-muted-foreground">
                {module.status}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay cursos.
          </p>
        )}
      </div>
    </div>
  );
}
