import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';
import CourseForm from './course-form';
import AssignCourseForm from './assign-course-form';

export default async function LocationCoursesPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  const access = await requireLocationAccess(groupSlug, locationSlug);
  const locationRole = access.roles.locationRole ?? null;
  const canManageCourses =
    access.roles.isGroupAdmin ||
    locationRole === 'location_admin' ||
    locationRole === 'trainer';

  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const modulesQuery = supabase
    .from('modules')
    .select('id, title, status, created_at')
    .eq('location_id', access.location.id)
    .order('created_at', { ascending: false });
  const { data: modules } = canManageCourses
    ? await modulesQuery
    : await modulesQuery.eq('status', 'published');

  const { data: legacyCourses } =
    profile?.org_id
      ? await supabase
          .from('modules')
          .select('id, title')
          .eq('org_id', profile.org_id)
          .is('location_id', null)
          .order('created_at', { ascending: false })
      : { data: [] };

  const moduleList = modules ?? [];
  const basePath = `/${access.group.slug}/${access.location.slug}/courses`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cursos</h1>
          <p className="text-sm text-muted-foreground">
            {access.group.name} · {access.location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}`}>
            Volver al local
          </Link>
        </Button>
      </header>

      {canManageCourses ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CourseForm
            locationId={access.location.id}
            revalidatePathname={basePath}
          />
          <AssignCourseForm
            locationId={access.location.id}
            revalidatePathname={basePath}
            legacyCourses={legacyCourses ?? []}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Listado</h2>
        {moduleList.length ? (
          <div className="space-y-2">
            {moduleList.map((module) => (
              <Link
                key={module.id}
                href={
                  canManageCourses
                    ? `${basePath}/${module.id}`
                    : `${basePath}/${module.id}/view`
                }
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition hover:bg-muted"
              >
                <span className="font-medium">{module.title}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                  {module.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay cursos creados para este local.
          </p>
        )}
      </section>
    </div>
  );
}
