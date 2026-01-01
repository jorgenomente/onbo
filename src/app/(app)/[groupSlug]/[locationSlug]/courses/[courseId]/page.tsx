import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
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
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;

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

  let access = null;
  let canManageCourse = false;
  if (!isSuperAdmin) {
    access = await requireLocationAccess(groupSlug, locationSlug);
    canManageCourse =
      access.roles.isGroupAdmin ||
      access.roles.locationRole === 'location_admin' ||
      access.roles.locationRole === 'trainer';
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;

  const { data: group } = isSuperAdmin
    ? await dataClient
        .from('groups')
        .select('id, name, slug')
        .eq('slug', groupSlug)
        .maybeSingle()
    : { data: access?.group ?? null };

  if (!group) {
    notFound();
  }

  const { data: location } = isSuperAdmin
    ? await dataClient
        .from('locations')
        .select('id, group_id, name, slug')
        .eq('group_id', group.id)
        .eq('slug', locationSlug)
        .maybeSingle()
    : { data: access?.location ?? null };

  if (!location) {
    notFound();
  }

  const { data: module } = await dataClient
    .from('modules')
    .select('id, title, description, status')
    .eq('id', parsedModuleId.data)
    .eq('location_id', location.id)
    .maybeSingle();

  if (!module) {
    notFound();
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Builder del curso</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
          <p className="text-xs text-muted-foreground">
            {group.name} · {location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={coursesPath}>Volver a cursos</Link>
        </Button>
      </header>

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
    </div>
  );
}
