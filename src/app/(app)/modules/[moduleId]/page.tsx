import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import LessonContent from '@/components/lesson/LessonContent';
import ResourceCard from '@/components/resources/ResourceCard';
import { getModulePlayerData } from '@/server/queries/modules/getModulePlayerData';
import { getModuleProgress } from '@/server/queries/progress/getModuleProgress';
import { markLessonDone } from '@/server/actions/progress/markLessonDone';
import { CheckCircle2 } from 'lucide-react';
import { getMyQuizStatusForModule } from '@/server/queries/quizzes/getMyQuizStatusForModule';
import { getModuleResources } from '@/server/queries/resources/getModuleResources';

const unitIdSchema = z.string().uuid();
const lessonIdSchema = z.string().uuid();

export default async function ModuleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { moduleId } = await params;
  const sp = searchParams ? await searchParams : {};
  if (!moduleId) {
    notFound();
  }

  const profile = await getCurrentProfile();
  if (!profile?.org_id) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[modules/player] missing profile', {
        moduleId,
        profile,
      });
    }
    return (
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <h1 className="text-lg font-semibold">Perfil no disponible</h1>
        <p className="text-muted-foreground">
          No encontramos un perfil activo. Revisá el seed o la configuración de
          autenticación antes de continuar.
        </p>
      </div>
    );
  }

  const { module, units, moduleError, unitsError, lessonsError } =
    await getModulePlayerData(moduleId, profile);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[modules/player] module query', {
      moduleId,
      org_id: profile.org_id,
      role: profile.role,
      module,
      moduleError,
      unitsError,
      lessonsError,
    });
  }

  if (moduleError || unitsError || lessonsError) {
    return (
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <h1 className="text-lg font-semibold">Error cargando módulo</h1>
        <p className="text-muted-foreground">
          Ocurrió un problema al consultar el módulo. Intentalo de nuevo.
        </p>
        {process.env.NODE_ENV !== 'production' ? (
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <p>moduleId: {moduleId}</p>
            <p>org_id: {profile.org_id}</p>
            <p>role: {profile.role}</p>
            <p>moduleError: {moduleError ?? 'none'}</p>
            <p>unitsError: {unitsError ?? 'none'}</p>
            <p>lessonsError: {lessonsError ?? 'none'}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (!module) {
    notFound();
  }

  const isAdmin = isAdminLike(profile.role);
  if (!isAdmin && module.status !== 'published') {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">No disponible</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo aún no está publicado.
        </p>
        <Button asChild variant="outline">
          <Link href="/home">Volver</Link>
        </Button>
      </div>
    );
  }

  const unitsList = units ?? [];
  const isEmployee = profile.role === 'employee';
  const moduleResources = await getModuleResources(moduleId, profile.org_id);
  const moduleProgress = isEmployee
    ? await getModuleProgress(moduleId, profile)
    : { doneLessonIds: new Set<string>(), doneCount: 0, totalCount: 0, percent: 0 };
  const quizStatus = isEmployee
    ? await getMyQuizStatusForModule(moduleId)
    : { finalQuiz: null, unitQuizzes: [] };
  const unitIdRaw = Array.isArray(sp.unitId) ? sp.unitId[0] : sp.unitId;
  const lessonIdRaw = Array.isArray(sp.lessonId) ? sp.lessonId[0] : sp.lessonId;
  const parsedUnitId = unitIdRaw ? unitIdSchema.safeParse(unitIdRaw) : null;
  const parsedLessonId = lessonIdRaw
    ? lessonIdSchema.safeParse(lessonIdRaw)
    : null;
  const selectedUnitId =
    parsedUnitId && parsedUnitId.success ? parsedUnitId.data : null;
  const selectedLessonId =
    parsedLessonId && parsedLessonId.success ? parsedLessonId.data : null;

  const flatLessons = unitsList.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ unit, lesson })),
  );
  const activeEntry = flatLessons.find(
    (entry) =>
      entry.unit.id === selectedUnitId &&
      entry.lesson.id === selectedLessonId,
  );
  const fallbackEntry = flatLessons[0] ?? null;
  const resolvedEntry = activeEntry ?? fallbackEntry;
  const activeUnit = resolvedEntry?.unit ?? null;
  const activeLesson = resolvedEntry?.lesson ?? null;
  const activeUnitLessons = activeUnit?.lessons ?? [];
  const isUnitComplete =
    isEmployee &&
    activeUnitLessons.length > 0 &&
    activeUnitLessons.every((lesson) =>
      moduleProgress.doneLessonIds.has(lesson.id),
    );
  const unitQuizStatus = activeUnit
    ? quizStatus.unitQuizzes.find((item) => item.unitId === activeUnit.id)
    : null;
  const unitQuizAttempt = unitQuizStatus?.latestAttempt ?? null;
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
  const basePath = `/modules/${moduleId}`;
  const contentValue = activeLesson?.content_json ?? null;
  const isLessonDone = activeLesson
    ? moduleProgress.doneLessonIds.has(activeLesson.id)
    : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{module.title}</h1>
            {module.description ? (
              <p className="text-sm text-muted-foreground">
                {module.description}
              </p>
            ) : null}
          </div>
          {isEmployee ? (
            <div className="space-y-3 text-right">
              <div className="min-w-[160px] space-y-2">
                <div className="text-xs text-muted-foreground">
                  {moduleProgress.percent}% completado
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${moduleProgress.percent}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {moduleProgress.doneCount}/{moduleProgress.totalCount} lecciones
                </div>
              </div>
              {quizStatus.finalQuiz ? (
                <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">Quiz final</div>
                  {quizStatus.finalQuiz.latestAttempt ? (
                    <div>
                      Completado · {quizStatus.finalQuiz.latestAttempt.score}% (
                      {quizStatus.finalQuiz.latestAttempt.passed
                        ? 'Aprobado'
                        : 'Reprobado'}
                      )
                    </div>
                  ) : (
                    <div>Pendiente</div>
                  )}
                  <div className="mt-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${basePath}/quiz`}>
                        {quizStatus.finalQuiz.latestAttempt
                          ? 'Ver resultados'
                          : 'Rendir quiz'}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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
            Este módulo aún no tiene lecciones.
          </section>
        )}

        {flatLessons.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isEmployee && activeLesson ? (
              <form
                action={async (formData) => {
                  await markLessonDone(formData);
                }}
              >
                <input type="hidden" name="module_id" value={moduleId} />
                <input type="hidden" name="lesson_id" value={activeLesson.id} />
                <Button type="submit" variant="secondary" disabled={isLessonDone}>
                  {isLessonDone ? 'Completada' : 'Marcar como completada'}
                </Button>
              </form>
            ) : (
              <span />
            )}
            {activeUnit && unitQuizStatus ? (
              <Button
                asChild
                variant={unitQuizAttempt ? 'secondary' : 'outline'}
                disabled={!isUnitComplete && !unitQuizAttempt}
              >
                <Link href={`${basePath}/units/${activeUnit.id}/quiz`}>
                  {unitQuizAttempt
                    ? `Ver resultados (${unitQuizAttempt.score}%)`
                    : 'Rendir quiz de esta unidad'}
                </Link>
              </Button>
            ) : null}
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
              <Button asChild>
                <Link
                  href={`${basePath}?unitId=${nextEntry.unit.id}&lessonId=${nextEntry.lesson.id}`}
                >
                  Siguiente
                </Link>
              </Button>
            ) : (
              <>
                {isEmployee && moduleProgress.percent === 100 ? (
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
          {moduleResources.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {moduleResources.map((resource) => (
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
            {unitsList.length}
          </span>
        </div>
        {unitsList.length ? (
          <Accordion
            type="multiple"
            defaultValue={activeUnit ? [activeUnit.id] : []}
            className="rounded-lg border px-3"
          >
            {unitsList.map((unit) => {
              const unitLessons = unit.lessons ?? [];
              const unitQuiz = quizStatus.unitQuizzes.find(
                (item) => item.unitId === unit.id,
              );
              const unitQuizAttempt = unitQuiz?.latestAttempt ?? null;
              return (
                <AccordionItem key={unit.id} value={unit.id}>
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex flex-col text-left">
                      <span className="font-semibold">{unit.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {unitLessons.length} lecciones
                      </span>
                      {unitQuiz ? (
                        <span className="text-[11px] text-muted-foreground">
                          Quiz:{' '}
                          {unitQuizAttempt
                            ? `${unitQuizAttempt.score}%`
                            : 'Pendiente'}
                        </span>
                      ) : null}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    {unitLessons.length ? (
                      <div className="space-y-2">
                        {unitLessons.map((lesson, index) => {
                          const isActive = activeLesson?.id === lesson.id;
                          const isDone = moduleProgress.doneLessonIds.has(
                            lesson.id,
                          );
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
