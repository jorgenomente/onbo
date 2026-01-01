import Link from 'next/link';
import { z } from 'zod';

import LessonContent from '@/components/lesson/LessonContent';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { markLessonDoneByLocation } from '@/server/actions/progress/markLessonDoneByLocation';
import { requireCourseViewAccess } from '@/server/guards/requireCourseViewAccess';
import { getCourseProgressByLocation } from '@/server/queries/progress/getCourseProgressByLocation';
import { getCourseResourcesByLocation } from '@/server/queries/resources/getCourseResourcesByLocation';
import { CheckCircle2 } from 'lucide-react';
import ResourceCard from '@/components/resources/ResourceCard';
import { getCourseQuizStatusByLocation } from '@/server/queries/quizzes/getCourseQuizStatusByLocation';

const unitIdSchema = z.string().uuid();
const lessonIdSchema = z.string().uuid();

type UnitRow = {
  id: string;
  title: string;
  order_index: number | null;
};

type LessonRow = {
  id: string;
  unit_id: string | null;
  title: string;
  order_index: number | null;
  content_json: unknown | null;
};

export default async function CourseViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const sp = searchParams ? await searchParams : {};

  const ctx = await requireCourseViewAccess({ groupSlug, locationSlug, courseId });

  const supabase = await createSupabaseServerClient();
  const { data: units } = await supabase
    .from('module_units')
    .select('id, title, order_index')
    .eq('module_id', ctx.course.id)
    .order('order_index', { ascending: true });

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, unit_id, title, order_index, content_json')
    .eq('module_id', ctx.course.id)
    .order('order_index', { ascending: true });

  const unitsList = (units ?? []) as UnitRow[];
  const lessonsList = (lessons ?? []) as LessonRow[];
  const unitMap = new Map(
    unitsList.map((unit) => [unit.id, { ...unit, lessons: [] as LessonRow[] }]),
  );

  lessonsList.forEach((lesson) => {
    if (!lesson.unit_id) {
      return;
    }
    const unit = unitMap.get(lesson.unit_id);
    if (unit) {
      unit.lessons.push(lesson);
    }
  });

  const unitsWithLessons = Array.from(unitMap.values()).map((unit) => ({
    ...unit,
    lessons: [...unit.lessons].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    ),
  }));

  const flatLessons = unitsWithLessons.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ unit, lesson })),
  );

  const unitIdRaw = Array.isArray(sp.unitId) ? sp.unitId[0] : sp.unitId;
  const lessonIdRaw = Array.isArray(sp.lessonId) ? sp.lessonId[0] : sp.lessonId;
  const parsedUnitId = unitIdRaw ? unitIdSchema.safeParse(unitIdRaw) : null;
  const parsedLessonId = lessonIdRaw ? lessonIdSchema.safeParse(lessonIdRaw) : null;
  const selectedUnitId =
    parsedUnitId && parsedUnitId.success ? parsedUnitId.data : null;
  const selectedLessonId =
    parsedLessonId && parsedLessonId.success ? parsedLessonId.data : null;

  const activeEntry = flatLessons.find(
    (entry) =>
      entry.unit.id === selectedUnitId &&
      entry.lesson.id === selectedLessonId,
  );
  const fallbackEntry = flatLessons[0] ?? null;
  const resolvedEntry = activeEntry ?? fallbackEntry;
  const activeUnit = resolvedEntry?.unit ?? null;
  const activeLesson = resolvedEntry?.lesson ?? null;
  const activeIndex = resolvedEntry
    ? flatLessons.findIndex(
        (entry) =>
          entry.unit.id === resolvedEntry.unit.id &&
          entry.lesson.id === resolvedEntry.lesson.id,
      )
    : -1;
  const prevEntry = activeIndex > 0 ? flatLessons[activeIndex - 1] : null;
  const nextEntry =
    activeIndex >= 0 && activeIndex < flatLessons.length - 1
      ? flatLessons[activeIndex + 1]
      : null;

  const basePath = `/${ctx.group.slug}/${ctx.location.slug}/courses/${ctx.course.id}/view`;
  const contentValue = activeLesson?.content_json ?? null;
  const progressSnapshot = await getCourseProgressByLocation({
    courseId: ctx.course.id,
    locationId: ctx.location.id,
    userId: ctx.user.id,
  });
  const resources = await getCourseResourcesByLocation({
    courseId: ctx.course.id,
    locationId: ctx.location.id,
    viewerRole: ctx.role,
  });
  const quizStatus = await getCourseQuizStatusByLocation({
    courseId: ctx.course.id,
    locationId: ctx.location.id,
    userId: ctx.user.id,
  });
  const doneLessonIds = new Set(progressSnapshot.completedLessonIds);
  const progressPercent = progressSnapshot.percent;
  const doneCount = progressSnapshot.completedCount;
  const totalCount = progressSnapshot.totalLessons;
  const isLessonDone = activeLesson
    ? doneLessonIds.has(activeLesson.id)
    : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{ctx.course.title}</h1>
            {ctx.course.description ? (
              <p className="text-sm text-muted-foreground">
                {ctx.course.description}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {ctx.group.name} · {ctx.location.name}
            </p>
          </div>
          {ctx.role === 'employee' ? (
            <div className="space-y-3 text-right">
              <div className="min-w-[160px] space-y-2">
                <div className="text-xs text-muted-foreground">
                  {progressPercent}% completado
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {doneCount}/{totalCount} lecciones
                </div>
              </div>
            </div>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/${ctx.group.slug}/${ctx.location.slug}/courses`}>
              Volver a cursos
            </Link>
          </Button>
        </header>

        {flatLessons.length ? (
          <section className="space-y-4 rounded-lg border p-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lección</p>
              <h2 className="text-xl font-semibold">
                {activeLesson?.title ?? 'Lección'}
              </h2>
              {activeUnit ? (
                <p className="text-xs text-muted-foreground">
                  Unidad: {activeUnit.title}
                </p>
              ) : null}
            </div>
            <LessonContent blocks={contentValue} />
          </section>
        ) : (
          <section className="rounded-lg border p-6 text-sm text-muted-foreground">
            Este curso aún no tiene lecciones.
          </section>
        )}

        {flatLessons.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {ctx.role === 'employee' && activeLesson ? (
              <form action={markLessonDoneByLocation}>
                <input type="hidden" name="group_slug" value={ctx.group.slug} />
                <input
                  type="hidden"
                  name="location_slug"
                  value={ctx.location.slug}
                />
                <input type="hidden" name="course_id" value={ctx.course.id} />
                <input type="hidden" name="lesson_id" value={activeLesson.id} />
                <Button type="submit" variant="secondary" disabled={isLessonDone}>
                  {isLessonDone ? 'Completada' : 'Marcar como completada'}
                </Button>
              </form>
            ) : (
              <span />
            )}
            {prevEntry ? (
              <Button asChild variant="outline">
                <Link
                  href={`${basePath}?unitId=${prevEntry.unit.id}&lessonId=${prevEntry.lesson.id}`}
                >
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Anterior
              </Button>
            )}
            {nextEntry ? (
              <form action={markLessonDoneByLocation}>
                <input type="hidden" name="group_slug" value={ctx.group.slug} />
                <input
                  type="hidden"
                  name="location_slug"
                  value={ctx.location.slug}
                />
                <input type="hidden" name="course_id" value={ctx.course.id} />
                <input
                  type="hidden"
                  name="lesson_id"
                  value={activeLesson?.id ?? ''}
                />
                <input type="hidden" name="next_unit_id" value={nextEntry.unit.id} />
                <input
                  type="hidden"
                  name="next_lesson_id"
                  value={nextEntry.lesson.id}
                />
                <Button type="submit">Siguiente</Button>
              </form>
            ) : (
              <>
                {ctx.role === 'employee' &&
                quizStatus.quiz?.status === 'published' &&
                progressPercent === 100 ? (
                  <Button asChild variant="secondary">
                    <Link href={`${basePath}/quiz`}>Rendir quiz final</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    Completa el curso para habilitar el quiz
                  </Button>
                )}
              </>
            )}
          </div>
        ) : null}

        <section className="space-y-3 rounded-lg border p-5">
          <h3 className="text-sm font-semibold">Recursos del curso</h3>
          {resources.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay recursos disponibles para este curso.
            </p>
          )}
        </section>
      </main>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Unidades</h3>
          <span className="text-xs text-muted-foreground">
            {unitsWithLessons.length}
          </span>
        </div>
        {ctx.role === 'employee' && quizStatus.quiz ? (
          <div className="rounded-lg border p-3 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">Quiz final</div>
            {quizStatus.latestAttempt ? (
              <div>
                Completado · {quizStatus.latestAttempt.score}% (
                {quizStatus.latestAttempt.passed ? 'Aprobado' : 'Reprobado'})
              </div>
            ) : (
              <div>Pendiente</div>
            )}
            <div className="mt-2">
                {progressPercent >= 100 && quizStatus.quiz.status === 'published' ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${basePath}/quiz`}>
                      {quizStatus.latestAttempt
                        ? 'Ver resultados'
                        : 'Rendir quiz'}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Completa el curso para habilitar
                  </Button>
                )}
            </div>
          </div>
        ) : null}
        {unitsWithLessons.length ? (
          <Accordion
            type="multiple"
            defaultValue={activeUnit ? [activeUnit.id] : []}
            className="rounded-lg border px-3"
          >
            {unitsWithLessons.map((unit) => {
              const unitLessons = unit.lessons ?? [];
              return (
                <AccordionItem key={unit.id} value={unit.id}>
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex flex-col text-left">
                      <span className="font-semibold">{unit.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {unitLessons.length} lecciones
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    {unitLessons.length ? (
                      <div className="space-y-2">
                        {unitLessons.map((lesson, index) => {
                          const isActive = activeLesson?.id === lesson.id;
                          const isDone = doneLessonIds.has(lesson.id);
                          return (
                            <Link
                              key={lesson.id}
                              href={`${basePath}?unitId=${unit.id}&lessonId=${lesson.id}`}
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                                isActive
                                  ? 'border-foreground/30 bg-muted'
                                  : 'hover:border-foreground/20 hover:bg-muted/40'
                              }`}
                            >
                              <span
                                className={`text-xs ${
                                  isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {index + 1}
                              </span>
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : null}
                              <span
                                className={
                                  isActive ? 'font-semibold' : 'font-medium'
                                }
                              >
                                {lesson.title}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin lecciones todavía.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No hay unidades para este módulo.
          </div>
        )}
      </aside>
    </div>
  );
}
