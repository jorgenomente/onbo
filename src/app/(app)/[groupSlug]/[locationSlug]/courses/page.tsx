import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { Button } from '@/components/ui/button';
import { createModuleForLocationAndRedirect } from '@/server/actions/modules/createModuleForLocationAndRedirect';
import { getAssignableCourses } from '@/server/queries/courses/getAssignableCourses';
import CourseForm from './course-form';
import AssignCourseForm from './assign-course-form';
import CourseList from './course-list';

export default async function LocationCoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupSlug, locationSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawView =
    typeof resolvedSearchParams.view === 'string'
      ? resolvedSearchParams.view
      : undefined;
  const access = await requireLocationAccess(groupSlug, locationSlug);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowlist = (process.env.ONBO_SUPERADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isSuperAdmin =
    !!user?.email && allowlist.includes(user.email.toLowerCase());
  const locationRole = access.roles.locationRole ?? null;
  const canManageCourses =
    isSuperAdmin ||
    access.roles.isGroupAdmin ||
    locationRole === 'location_admin' ||
    locationRole === 'trainer';
  const view =
    canManageCourses && rawView === 'employee' ? 'employee' : 'builder';
  const modulesClient = isSuperAdmin ? createServiceRoleClient() : supabase;
  const { data: locationModules } = await modulesClient
    .from('modules')
    .select('id')
    .eq('location_id', access.location.id);

  const moduleIds = (locationModules ?? []).map((row) => row.id);
  const { data: courseModuleRows } = moduleIds.length
    ? await modulesClient
        .from('course_modules')
        .select('course_id')
        .in('module_id', moduleIds)
    : { data: [] as { course_id: string }[] };

  const courseIds = Array.from(
    new Set((courseModuleRows ?? []).map((row) => row.course_id)),
  );
  const coursesQuery = courseIds.length
    ? modulesClient
        .from('courses')
        .select('id, title, status, created_at')
        .in('id', courseIds)
        .order('created_at', { ascending: false })
    : null;
  const { data: courses } =
    coursesQuery && (!canManageCourses || view === 'employee')
      ? await coursesQuery.eq('status', 'active')
      : coursesQuery
        ? await coursesQuery
        : { data: [] };

  const legacyCourses = user?.id
    ? await getAssignableCourses({ viewerUserId: user.id })
    : [];

  const courseList = courses ?? [];
  const basePath = `/${access.group.slug}/${access.location.slug}/courses`;
  const isEmployeePreview = view === 'employee';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cursos</h1>
          <p className="text-sm text-muted-foreground">
            {access.group.name} · {access.location.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageCourses ? (
            <form action={createModuleForLocationAndRedirect}>
              <input
                type="hidden"
                name="location_id"
                value={access.location.id}
              />
              <input
                type="hidden"
                name="group_slug"
                value={access.group.slug}
              />
              <input
                type="hidden"
                name="location_slug"
                value={access.location.slug}
              />
              <input type="hidden" name="title" value="Nuevo curso" />
              <Button type="submit" size="sm">
                Crear curso
              </Button>
            </form>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/${access.group.slug}/${access.location.slug}`}>
              Volver al local
            </Link>
          </Button>
        </div>
      </header>

      {canManageCourses ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={isEmployeePreview ? 'outline' : 'default'}
            size="sm"
          >
            <Link href={`${basePath}?view=builder`}>Builder</Link>
          </Button>
          <Button
            asChild
            variant={isEmployeePreview ? 'default' : 'outline'}
            size="sm"
          >
            <Link href={`${basePath}?view=employee`}>
              Preview (Employee)
            </Link>
          </Button>
          {isEmployeePreview ? (
            <p className="text-xs text-muted-foreground">
              Vista previa de empleado (solo lectura).
            </p>
          ) : null}
        </div>
      ) : null}

      {canManageCourses && !isEmployeePreview ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CourseForm
            locationId={access.location.id}
            revalidatePathname={basePath}
          />
          <AssignCourseForm
            locationId={access.location.id}
            revalidatePathname={basePath}
            legacyCourses={legacyCourses ?? []}
            locationName={access.location.name}
            groupSlug={access.group.slug}
            locationSlug={access.location.slug}
            showOrgId={isSuperAdmin}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Listado</h2>
        <CourseList
          courses={courseList}
          basePath={basePath}
          canEditNames={canManageCourses && view === 'builder'}
          isEmployeePreview={isEmployeePreview}
          revalidatePathname={basePath}
        />
      </section>
    </div>
  );
}
