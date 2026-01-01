import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';

const moduleIdSchema = z.string().uuid();
const lessonIdSchema = z.string().uuid();

type LessonRecord = {
  id: string;
  title: string;
  order_index: number | null;
  content_json: unknown;
};

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{
    groupSlug: string;
    locationSlug: string;
    courseId: string;
    lessonId: string;
  }>;
}) {
  const { groupSlug, locationSlug, courseId, lessonId } = await params;
  const access = await requireLocationAccess(groupSlug, locationSlug);

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  const parsedLessonId = lessonIdSchema.safeParse(lessonId);
  if (!parsedModuleId.success || !parsedLessonId.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: module } = await supabase
    .from('modules')
    .select('id, title, status')
    .eq('id', parsedModuleId.data)
    .eq('location_id', access.location.id)
    .maybeSingle();

  if (!module) {
    notFound();
  }

  if (access.roles.locationRole === 'employee' && module.status !== 'published') {
    notFound();
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, order_index, created_at')
    .eq('module_id', module.id)
    .order('order_index', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  const lessonsList = (lessons ?? []) as Array<{
    id: string;
    title: string;
    order_index: number | null;
  }>;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, order_index, content_json')
    .eq('id', parsedLessonId.data)
    .eq('module_id', module.id)
    .maybeSingle();

  if (!lesson) {
    notFound();
  }

  const lessonIndex = lessonsList.findIndex(
    (item) => item.id === parsedLessonId.data,
  );
  const prevLesson =
    lessonIndex > 0 ? lessonsList[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < lessonsList.length - 1
      ? lessonsList[lessonIndex + 1]
      : null;

  const coursePath = `/${access.group.slug}/${access.location.slug}/courses/${module.id}/view`;

  let contentBody: string | null = null;
  if (typeof lesson.content_json === 'string') {
    contentBody = lesson.content_json;
  } else if (lesson.content_json) {
    contentBody = JSON.stringify(lesson.content_json, null, 2);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button asChild variant="outline" size="sm">
          <Link href={coursePath}>← Volver al curso</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
          <p className="text-xs text-muted-foreground">
            {access.group.name} · {access.location.name}
          </p>
        </div>
      </header>

      <section className="rounded-lg border p-4 text-sm">
        {contentBody ? (
          <pre className="whitespace-pre-wrap text-sm">{contentBody}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta leccion no tiene contenido todavia.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {prevLesson ? (
          <Button asChild variant="outline">
            <Link href={`${coursePath}/lessons/${prevLesson.id}`}>
              ← Anterior
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Button asChild variant="outline">
            <Link href={`${coursePath}/lessons/${nextLesson.id}`}>
              Siguiente →
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </div>

      <Button asChild variant="ghost">
        <Link href={coursePath}>Volver al contenido</Link>
      </Button>
    </div>
  );
}
