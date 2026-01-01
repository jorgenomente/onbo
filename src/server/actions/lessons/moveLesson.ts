'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type MoveLessonState = { error: string | null };

const moveLessonSchema = z.object({
  course_id: z.string().uuid(),
  location_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function moveLesson(
  formDataOrState: FormData | MoveLessonState,
  maybeFormData?: FormData,
): Promise<MoveLessonState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const parsed = moveLessonSchema.safeParse({
    course_id: formData.get('course_id'),
    location_id: formData.get('location_id'),
    lesson_id: formData.get('lesson_id'),
    direction: formData.get('direction'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;

  const { data: module } = await dataClient
    .from('modules')
    .select('id, location_id, group_id')
    .eq('id', parsed.data.course_id)
    .maybeSingle();

  if (!module || module.location_id !== parsed.data.location_id) {
    return { error: 'Curso no encontrado.' };
  }

  if (!isSuperAdmin) {
    const { data: groupMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', module.group_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: locationMembership } = await supabase
      .from('location_memberships')
      .select('role')
      .eq('location_id', parsed.data.location_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isGroupAdmin = groupMembership?.role === 'group_admin';
    const isLocationManager =
      locationMembership?.role === 'location_admin' ||
      locationMembership?.role === 'trainer';

    if (!isGroupAdmin && !isLocationManager) {
      return { error: 'No autorizado.' };
    }
  }

  const { data: lessons } = await dataClient
    .from('lessons')
    .select('id, order_index, created_at')
    .eq('module_id', parsed.data.course_id)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  const lessonList = lessons ?? [];
  const currentIndex = lessonList.findIndex(
    (lesson) => lesson.id === parsed.data.lesson_id,
  );

  if (currentIndex === -1) {
    return { error: 'Leccion no encontrada.' };
  }

  const neighborIndex =
    parsed.data.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (neighborIndex < 0 || neighborIndex >= lessonList.length) {
    return { error: null };
  }

  const currentLesson = lessonList[currentIndex];
  const neighborLesson = lessonList[neighborIndex];
  const currentOrder = currentLesson.order_index ?? currentIndex + 1;
  const neighborOrder = neighborLesson.order_index ?? neighborIndex + 1;

  const { error: updateCurrentError } = await dataClient
    .from('lessons')
    .update({ order_index: neighborOrder })
    .eq('id', currentLesson.id);

  const { error: updateNeighborError } = await dataClient
    .from('lessons')
    .update({ order_index: currentOrder })
    .eq('id', neighborLesson.id);

  if (updateCurrentError || updateNeighborError) {
    return { error: 'No se pudo reordenar la leccion.' };
  }

  const { data: location } = await dataClient
    .from('locations')
    .select('id, slug, group_id')
    .eq('id', parsed.data.location_id)
    .maybeSingle();

  const { data: group } = location
    ? await dataClient
        .from('groups')
        .select('id, slug')
        .eq('id', location.group_id)
        .maybeSingle()
    : { data: null };

  if (location && group) {
    revalidatePath(`/${group.slug}/${location.slug}/courses/${module.id}/lessons`);
  }

  return { error: null };
}
