import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import CourseResourceForm from './course-resource-form';
import CourseResourceRow from './course-resource-row';

const courseIdSchema = z.string().uuid();

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function CourseResourcesPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const parsedCourseId = courseIdSchema.safeParse(courseId);
  if (!parsedCourseId.success) {
    notFound();
  }

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

  const access = isSuperAdmin
    ? null
    : await requireLocationAccess(groupSlug, locationSlug);

  const canManage =
    isSuperAdmin ||
    !!access &&
      (access.roles.isGroupAdmin ||
        access.roles.locationRole === 'location_admin' ||
        access.roles.locationRole === 'trainer');

  if (!canManage) {
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

  const adminClient = createServiceRoleClient();
  const { data: course } = await adminClient
    .from('modules')
    .select('id, title, location_id, org_id')
    .eq('id', parsedCourseId.data)
    .eq('location_id', location.id)
    .maybeSingle();

  if (!course || !course.org_id) {
    notFound();
  }

  const { data: resources } = await adminClient
    .from('module_resources')
    .select('id, title, type, url, description')
    .eq('org_id', course.org_id)
    .eq('module_id', course.id)
    .order('created_at', { ascending: false });

  const list = resources ?? [];
  const coursesPath = `/${group.slug}/${location.slug}/courses`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Recursos</h1>
          <p className="text-sm text-muted-foreground">{course.title}</p>
          <p className="text-xs text-muted-foreground">
            {group.name} · {location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`${coursesPath}/${course.id}`}>Volver al curso</Link>
        </Button>
      </header>

      <CourseResourceForm
        groupSlug={group.slug}
        locationSlug={location.slug}
        courseId={course.id}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recursos guardados</h2>
        {list.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((resource) => (
              <CourseResourceRow
                key={resource.id}
                resource={resource}
                groupSlug={group.slug}
                locationSlug={location.slug}
                courseId={course.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aun no hay recursos cargados para este curso.
          </p>
        )}
      </section>
    </div>
  );
}
