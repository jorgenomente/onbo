import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createLesson } from '@/server/actions/lessons/createLesson';
import { reorderLessons } from '@/server/actions/lessons/reorderLessons';
import { updateLesson } from '@/server/actions/lessons/updateLesson';

type BuilderLesson = {
  id: string;
  title: string;
  order_index: number | null;
};

type LessonsPanelProps = {
  moduleId: string;
  locationId?: string;
  unit: { id: string; title: string } | null;
  lessons: BuilderLesson[];
  activeLessonId: string | null;
  basePath: string;
};

export default function LessonsPanel({
  moduleId,
  locationId,
  unit,
  lessons,
  activeLessonId,
  basePath,
}: LessonsPanelProps) {
  const createLessonAction = async (formData: FormData) => {
    'use server';
    await createLesson(formData);
  };
  const reorderLessonsAction = async (formData: FormData) => {
    'use server';
    await reorderLessons(formData);
  };
  const updateLessonAction = async (formData: FormData) => {
    'use server';
    await updateLesson(formData);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Lecciones</CardTitle>
        <CardDescription>
          {unit ? `Unidad: ${unit.title}` : 'Selecciona una unidad.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unit ? (
          <form
            action={createLessonAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="module_id" value={moduleId} />
            <input type="hidden" name="unit_id" value={unit.id} />
            {locationId ? (
              <input type="hidden" name="location_id" value={locationId} />
            ) : null}
            <Input name="title" placeholder="Nueva leccion" required />
            <Button type="submit" size="sm">
              Crear
            </Button>
          </form>
        ) : null}

        {!unit ? (
          <p className="text-sm text-muted-foreground">
            Selecciona una unidad para ver sus lecciones.
          </p>
        ) : lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay lecciones. Crea la primera leccion.
          </p>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === activeLessonId;
              return (
                <div
                  key={lesson.id}
                  className={`rounded-lg border p-3 text-sm ${
                    isActive ? 'border-foreground/30 bg-muted/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`${basePath}?unitId=${unit?.id}&lessonId=${lesson.id}`}
                      className="font-medium hover:underline"
                    >
                      {lesson.title}
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form
                      action={reorderLessonsAction}
                    >
                      <input type="hidden" name="lesson_id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                    </form>
                    <form
                      action={reorderLessonsAction}
                    >
                      <input type="hidden" name="lesson_id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        disabled={index === lessons.length - 1}
                      >
                        ↓
                      </Button>
                    </form>
                    <form
                      action={updateLessonAction}
                      className="flex flex-1 gap-2"
                    >
                      <input type="hidden" name="lesson_id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <Input
                        name="title"
                        defaultValue={lesson.title}
                        className="h-8"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Guardar
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
