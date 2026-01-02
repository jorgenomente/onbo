import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';
import CourseStatusForm from './course-status-form';

const moduleIdSchema = z.string().uuid();

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function LocationCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawView =
    typeof resolvedSearchParams.view === 'string'
      ? resolvedSearchParams.view
      : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());
  const profile = await getCurrentProfile();
  const viewerOrgId = profile?.org_id ?? null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][detail]', {
      groupSlug,
      locationSlug,
      courseId,
      isSuperAdmin,
      viewerOrgId,
    });
  }

  let access = null;
  let canManageCourse = false;
  if (!isSuperAdmin) {
    access = await requireLocationAccess(groupSlug, locationSlug);
    canManageCourse =
      access.roles.isGroupAdmin ||
      access.roles.locationRole === 'location_admin' ||
      access.roles.locationRole === 'trainer';
  }
  if (isSuperAdmin) {
    canManageCourse = true;
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const { data: group, error: groupError } = isSuperAdmin
    ? await supabase
        .from('groups')
        .select('id, name, slug')
        .eq('slug', groupSlug)
        .maybeSingle()
    : { data: access?.group ?? null, error: null };

  if (!group) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[courses][detail] group lookup failed', {
        groupSlug,
        error: groupError?.message ?? null,
      });
    }
    notFound();
  }

  const { data: location, error: locationError } = isSuperAdmin
    ? await supabase
        .from('locations')
        .select('id, group_id, name, slug')
        .eq('group_id', group.id)
        .eq('slug', locationSlug)
        .maybeSingle()
    : { data: access?.location ?? null, error: null };

  if (!location) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[courses][detail] location lookup failed', {
        groupSlug,
        locationSlug,
        error: locationError?.message ?? null,
      });
    }
    notFound();
  }

  const { data: directModule, error: moduleError } = await supabase
    .from('modules')
    .select('id, title, description, status')
    .eq('id', parsedModuleId.data)
    .eq('location_id', location.id)
    .maybeSingle();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][detail] module lookup', {
      courseId: parsedModuleId.data,
      found: Boolean(directModule),
      error: moduleError?.message ?? null,
    });
  }

  let module = directModule;
  let courseTitle: string | null = null;
  let courseDescription: string | null = null;

  if (!module) {
    const courseQuery = supabase
      .from('courses')
      .select('id, title, description, status, org_id')
      .eq('id', parsedModuleId.data);

    if (!isSuperAdmin) {
      if (!viewerOrgId) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[courses][detail] viewer org missing', {
            courseId: parsedModuleId.data,
          });
        }
        notFound();
      }
      courseQuery.eq('org_id', viewerOrgId);
    }

    const { data: course, error: courseError } = await courseQuery.maybeSingle();

    if (process.env.NODE_ENV !== 'production') {
      console.log('[courses][detail] course lookup', {
        courseId: parsedModuleId.data,
        found: Boolean(course),
        error: courseError?.message ?? null,
      });
    }

    if (!course) {
      notFound();
    }

    courseTitle = course.title;
    courseDescription = course.description ?? null;

    const { data: courseModule, error: courseModuleError } = await supabase
      .from('course_modules')
      .select(
        'module_id, order_index, modules!inner(id, title, description, status, location_id)',
      )
      .eq('course_id', course.id)
      .eq('modules.location_id', location.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (process.env.NODE_ENV !== 'production') {
      console.log('[courses][detail] course_modules lookup', {
        courseId: course.id,
        found: Boolean(courseModule?.modules),
        error: courseModuleError?.message ?? null,
      });
    }

    module = courseModule?.modules ?? null;

    if (!module) {
      notFound();
    }
  }

  if (!isSuperAdmin) {
    const locationRole = access?.roles.locationRole ?? null;
    if (locationRole === 'employee') {
      redirect(
        `/${group.slug}/${location.slug}/courses/${module.id}/view`,
      );
    }
    if (!canManageCourse) {
      notFound();
    }
  }

  const coursesPath = `/${group.slug}/${location.slug}/courses`;
  const view =
    canManageCourse && rawView === 'employee' ? 'employee' : 'builder';
  const isEmployeePreview = view === 'employee';

  let units: Array<{ id: string; title: string; order_index: number | null }> =
    [];
  let lessons: Array<{
    id: string;
    unit_id: string | null;
    title: string;
    order_index: number | null;
    content_json: unknown | null;
  }> = [];

  if (isEmployeePreview) {
    const { data: unitRows } = await dataClient
      .from('module_units')
      .select('id, title, order_index')
      .eq('module_id', module.id)
      .order('order_index', { ascending: true });
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, unit_id, title, order_index, content_json')
      .eq('module_id', module.id)
      .order('order_index', { ascending: true });

    units = (unitRows ?? []) as typeof units;
    lessons = (lessonRows ?? []) as typeof lessons;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {isEmployeePreview ? 'Preview del curso' : 'Builder del curso'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {courseTitle ?? module.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.name} · {location.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageCourse ? (
            <>
              <Button
                asChild
                variant={isEmployeePreview ? 'outline' : 'default'}
                size="sm"
              >
                <Link href={`${coursesPath}/${module.id}?view=builder`}>
                  Builder
                </Link>
              </Button>
              <Button
                asChild
                variant={isEmployeePreview ? 'default' : 'outline'}
                size="sm"
              >
                <Link href={`${coursesPath}/${module.id}?view=employee`}>
                  Preview (Employee)
                </Link>
              </Button>
            </>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={coursesPath}>Volver a cursos</Link>
          </Button>
        </div>
      </header>

      {isEmployeePreview ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="space-y-4">
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">
                {courseTitle ?? module.title ?? 'Curso'}
              </h2>
              {courseDescription ?? module.description ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {courseDescription ?? module.description}
                </p>
              ) : null}
            </section>
            {lessons.length ? (
              <section className="rounded-lg border p-5">
                <p className="text-xs text-muted-foreground">Lección</p>
                <h3 className="mt-1 text-lg font-semibold">
                  {lessons[0]?.title ?? 'Lección'}
                </h3>
                <div className="mt-4 text-sm text-muted-foreground">
                  Contenido de vista previa (solo lectura).
                </div>
              </section>
            ) : (
              <section className="rounded-lg border p-5 text-sm text-muted-foreground">
                Este curso aún no tiene lecciones.
              </section>
            )}
          </main>
          <aside className="space-y-3">
            <h3 className="text-sm font-semibold">Lecciones</h3>
            {lessons.length ? (
              <div className="space-y-2 text-sm">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-md border px-3 py-2"
                  >
                    {lesson.title}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Sin lecciones todavía.
              </div>
            )}
          </aside>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={`${coursesPath}/${module.id}/lessons`}
              className="rounded-lg border p-4 text-sm transition hover:border-muted-foreground/40 hover:bg-muted/30"
            >
              <h2 className="text-sm font-semibold">Lessons</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Gestiona las lecciones del curso.
              </p>
            </Link>
            <Link
              href={`${coursesPath}/${module.id}/resources`}
              className="rounded-lg border p-4 text-sm transition hover:border-muted-foreground/40 hover:bg-muted/30"
            >
              <h2 className="text-sm font-semibold">Resources</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Gestiona los recursos del curso.
              </p>
            </Link>
            <Link
              href={`${coursesPath}/${module.id}/quiz`}
              className="rounded-lg border p-4 text-sm transition hover:border-muted-foreground/40 hover:bg-muted/30"
            >
              <h2 className="text-sm font-semibold">Quiz</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Configura el quiz final del curso.
              </p>
            </Link>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">Estado</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                {module.status}
              </span>
              {isSuperAdmin || canManageCourse ? (
                <CourseStatusForm
                  groupSlug={group.slug}
                  locationSlug={location.slug}
                  courseId={module.id}
                  status={module.status}
                />
              ) : null}
            </div>
            {module.description ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {module.description}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
