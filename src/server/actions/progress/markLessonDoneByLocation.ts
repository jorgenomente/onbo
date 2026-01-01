'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  nextUnitId: z.string().uuid().optional(),
  nextLessonId: z.string().uuid().optional(),
});

export async function markLessonDoneByLocation(formData: FormData) {
  const parsed = inputSchema.safeParse({
    groupSlug: formData.get('group_slug'),
    locationSlug: formData.get('location_slug'),
    courseId: formData.get('course_id'),
    lessonId: formData.get('lesson_id'),
    nextUnitId: formData.get('next_unit_id'),
    nextLessonId: formData.get('next_lesson_id'),
  });

  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const access = await requireLocationAccess(
    parsed.data.groupSlug,
    parsed.data.locationSlug,
  );

  const { data: course } = await supabase
    .from('modules')
    .select('id, location_id, org_id')
    .eq('id', parsed.data.courseId)
    .eq('location_id', access.location.id)
    .maybeSingle();

  if (!course || !course.org_id) {
    throw new Error('Curso no encontrado.');
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, module_id')
    .eq('id', parsed.data.lessonId)
    .eq('module_id', parsed.data.courseId)
    .maybeSingle();

  if (!lesson) {
    throw new Error('Leccion no encontrada.');
  }

  const adminClient = createServiceRoleClient();
  const { error } = await adminClient.from('progress').upsert(
    {
      org_id: course.org_id,
      user_id: user.id,
      module_id: parsed.data.courseId,
      lesson_id: parsed.data.lessonId,
      status: 'done',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,user_id,module_id,lesson_id' },
  );

  if (error) {
    throw new Error(error.message ?? 'No se pudo guardar el progreso.');
  }

  const basePath = `/${access.group.slug}/${access.location.slug}/courses/${parsed.data.courseId}/view`;
  revalidatePath(basePath);

  if (parsed.data.nextUnitId && parsed.data.nextLessonId) {
    redirect(
      `${basePath}?unitId=${parsed.data.nextUnitId}&lessonId=${parsed.data.nextLessonId}`,
    );
  }
}
