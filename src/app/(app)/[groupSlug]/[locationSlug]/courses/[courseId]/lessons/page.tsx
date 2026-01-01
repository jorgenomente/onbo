import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';
import UnitsPanel from '@/components/admin/course-builder/UnitsPanel';
import LessonsPanel from '@/components/admin/course-builder/LessonsPanel';
import LessonEditor from '@/components/admin/course-builder/LessonEditor';

const courseIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();
const lessonIdSchema = z.string().uuid();

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function LessonsBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const sp = searchParams ? await searchParams : {};

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
  if (!isSuperAdmin) {
    access = await requireLocationAccess(groupSlug, locationSlug);
    const canManageLessons =
      access.roles.isGroupAdmin ||
      access.roles.locationRole === 'location_admin' ||
      access.roles.locationRole === 'trainer';
    if (!canManageLessons) {
      notFound();
    }
  }

  const parsedCourseId = courseIdSchema.safeParse(courseId);
  if (!parsedCourseId.success) {
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
    .select('id, title, location_id')
    .eq('id', parsedCourseId.data)
    .eq('location_id', location.id)
    .maybeSingle();

  if (!module) {
    notFound();
  }

  const { data: units } = await dataClient
    .from('module_units')
    .select('id, title, order_index')
    .eq('module_id', module.id)
    .order('order_index', { ascending: true });

  const { data: lessons } = await dataClient
    .from('lessons')
    .select('id, unit_id, title, order_index, created_at, content_json')
    .eq('module_id', module.id)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  const unitsList = units ?? [];
  const lessonsList = lessons ?? [];
  const unitMap = new Map(
    unitsList.map((unit) => [unit.id, { ...unit, lessons: [] as { id: string }[] }]),
  );

  lessonsList.forEach((lesson) => {
    if (!lesson.unit_id) {
      return;
    }
    const unit = unitMap.get(lesson.unit_id);
    if (unit) {
      unit.lessons.push({ id: lesson.id });
    }
  });

  const unitsWithLessons = Array.from(unitMap.values()).map((unit) => ({
    ...unit,
    lessons: [...unit.lessons],
  }));

  const unitIdRaw = Array.isArray(sp.unitId) ? sp.unitId[0] : sp.unitId;
  const lessonIdRaw = Array.isArray(sp.lessonId) ? sp.lessonId[0] : sp.lessonId;

  const parsedUnitId = unitIdRaw ? unitIdSchema.safeParse(unitIdRaw) : null;
  const parsedLessonId = lessonIdRaw ? lessonIdSchema.safeParse(lessonIdRaw) : null;

  const selectedUnit = parsedUnitId?.success
    ? unitsWithLessons.find((unit) => unit.id === parsedUnitId.data)
    : null;
  const activeUnit = selectedUnit ?? unitsWithLessons[0] ?? null;

  const unitLessons = activeUnit
    ? lessonsList.filter((lesson) => lesson.unit_id === activeUnit.id)
    : [];
  const selectedLesson = parsedLessonId?.success
    ? unitLessons.find((lesson) => lesson.id === parsedLessonId.data)
    : null;
  const activeLesson = selectedLesson ?? unitLessons[0] ?? null;

  const basePath = `/${group.slug}/${location.slug}/courses/${module.id}/lessons`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Builder del curso</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${group.slug}/${location.slug}/courses/${module.id}`}>
            Volver al curso
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_280px_minmax(0,1fr)]">
        <UnitsPanel
          moduleId={module.id}
          units={unitsWithLessons}
          activeUnitId={activeUnit?.id ?? null}
          basePath={basePath}
          locationId={location.id}
        />
        <LessonsPanel
          moduleId={module.id}
          unit={activeUnit ? { id: activeUnit.id, title: activeUnit.title } : null}
          lessons={unitLessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            order_index: lesson.order_index,
          }))}
          activeLessonId={activeLesson?.id ?? null}
          basePath={basePath}
          locationId={location.id}
        />
        <LessonEditor
          lesson={
            activeLesson
              ? {
                  id: activeLesson.id,
                  title: activeLesson.title,
                  content_json: activeLesson.content_json ?? [],
                }
              : null
          }
        />
      </div>
    </div>
  );
}
