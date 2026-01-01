import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import LessonsPanel from '@/components/admin/course-builder/LessonsPanel';
import LessonEditor from '@/components/admin/course-builder/LessonEditor';
import UnitsPanel from '@/components/admin/course-builder/UnitsPanel';
import { Button } from '@/components/ui/button';
import { getCourseBuilderData } from '@/server/queries/admin/getCourseBuilderData';
import { getLessonForEdit } from '@/server/queries/admin/getLessonForEdit';

const moduleIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();
const lessonIdSchema = z.string().uuid();

export default async function CourseBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { courseId } = await params;
  const sp = searchParams ? await searchParams : {};
  const profile = await getCurrentProfile();

  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const { module, units, moduleError, unitsError, lessonsError } =
    await getCourseBuilderData(parsedModuleId.data, profile);

  if (!module) {
    if (moduleError) {
      return (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Error cargando curso. Revisa permisos o RLS.
        </div>
      );
    }
    notFound();
  }

  if (unitsError || lessonsError) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando unidades o lecciones.
      </div>
    );
  }

  const unitIdRaw = Array.isArray(sp.unitId) ? sp.unitId[0] : sp.unitId;
  const lessonIdRaw = Array.isArray(sp.lessonId)
    ? sp.lessonId[0]
    : sp.lessonId;

  const parsedUnitId = unitIdRaw ? unitIdSchema.safeParse(unitIdRaw) : null;
  const parsedLessonId = lessonIdRaw
    ? lessonIdSchema.safeParse(lessonIdRaw)
    : null;

  const unitsList = units ?? [];
  const selectedUnit = parsedUnitId?.success
    ? unitsList.find((unit) => unit.id === parsedUnitId.data)
    : null;
  const activeUnit = selectedUnit ?? unitsList[0] ?? null;

  const unitLessons = activeUnit?.lessons ?? [];
  const selectedLesson = parsedLessonId?.success
    ? unitLessons.find((lesson) => lesson.id === parsedLessonId.data)
    : null;
  const activeLesson = selectedLesson ?? unitLessons[0] ?? null;

  const { lesson: lessonForEdit } = activeLesson
    ? await getLessonForEdit(activeLesson.id, profile)
    : { lesson: null };

  const basePath = `/admin/courses/${module.id}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Builder del curso</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/courses/${module.id}/resources`}>Recursos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/courses/${module.id}/quiz`}>Quiz final</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_280px_minmax(0,1fr)]">
        <UnitsPanel
          moduleId={module.id}
          units={unitsList}
          activeUnitId={activeUnit?.id ?? null}
          basePath={basePath}
        />
        <LessonsPanel
          moduleId={module.id}
          unit={activeUnit ? { id: activeUnit.id, title: activeUnit.title } : null}
          lessons={unitLessons}
          activeLessonId={activeLesson?.id ?? null}
          basePath={basePath}
        />
        <LessonEditor lesson={lessonForEdit} />
      </div>
    </div>
  );
}
