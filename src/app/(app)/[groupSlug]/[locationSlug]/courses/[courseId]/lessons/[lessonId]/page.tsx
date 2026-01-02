import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateLesson } from '@/server/actions/lessons/updateLesson';

const lessonIdSchema = z.string().uuid();
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

export default async function LessonEditorPage({
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

  const parsedCourseId = courseIdSchema.safeParse(courseId);
  const parsedLessonId = lessonIdSchema.safeParse(lessonId);
  if (!parsedCourseId.success || !parsedLessonId.success) {
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

  const { data: lesson } = await dataClient
    .from('lessons')
    .select('id, title, content_json, module_id')
    .eq('id', parsedLessonId.data)
    .maybeSingle();

  if (!lesson || lesson.module_id !== module.id) {
    notFound();
  }

  const basePath = `/${group.slug}/${location.slug}/courses/${module.id}/lessons`;
  const contentText = JSON.stringify(lesson.content_json ?? [], null, 2);

  const updateLessonAction = async (formData: FormData) => {
    'use server';
    await updateLesson(formData);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Editar lesson</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={basePath}>Volver a lessons</Link>
        </Button>
      </header>

      <form action={updateLessonAction} className="space-y-4">
        <input type="hidden" name="lesson_id" value={lesson.id} />
        <input type="hidden" name="course_id" value={module.id} />
        <input type="hidden" name="location_id" value={location.id} />
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="lesson-title">
            Titulo
          </label>
          <Input
            id="lesson-title"
            name="title"
            defaultValue={lesson.title}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="lesson-content">
            Contenido (JSON)
          </label>
          <Textarea
            id="lesson-content"
            name="content_json"
            defaultValue={contentText}
            rows={12}
          />
        </div>
        <Button type="submit">Guardar</Button>
      </form>
    </div>
  );
}
