'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { LessonBlocksSchema } from '@/lib/lessonBlocks';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type UpdateLessonContentState = { error: string | null };

const updateLessonContentSchema = z.object({
  lesson_id: z.string().uuid(),
  content_json: z.unknown(),
});

export async function updateLessonContent(
  payload: { lesson_id: string; content_json: unknown },
): Promise<UpdateLessonContentState> {
  const parsedInput = updateLessonContentSchema.safeParse(payload);
  if (!parsedInput.success) {
    return { error: 'Datos invalidos.' };
  }

  const normalized = parsedInput.data.content_json ?? [];
  const parsedBlocks = LessonBlocksSchema.safeParse(normalized);
  if (!parsedBlocks.success) {
    return { error: 'Contenido invalido.' };
  }

  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (profile && isAdminLike(profile.role)) {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, module_id')
      .eq('id', parsedInput.data.lesson_id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!lesson) {
      return { error: 'Leccion no encontrada.' };
    }

    const { error } = await supabase
      .from('lessons')
      .update({ content_json: parsedBlocks.data })
      .eq('id', parsedInput.data.lesson_id)
      .eq('org_id', profile.org_id);

    if (error) {
      return { error: error.message ?? 'No se pudo guardar el contenido.' };
    }

    revalidatePath(`/admin/courses/${lesson.module_id}`);
    revalidatePath(`/modules/${lesson.module_id}`);
    return { error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const allowlist = (process.env.ONBO_SUPERADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;

  const { data: lesson } = await dataClient
    .from('lessons')
    .select('id, module_id')
    .eq('id', parsedInput.data.lesson_id)
    .maybeSingle();

  if (!lesson) {
    return { error: 'Leccion no encontrada.' };
  }

  const { data: module } = await dataClient
    .from('modules')
    .select('id, location_id, group_id')
    .eq('id', lesson.module_id)
    .maybeSingle();

  if (!module?.location_id) {
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
      .eq('location_id', module.location_id)
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

  const { error } = await dataClient
    .from('lessons')
    .update({ content_json: parsedBlocks.data })
    .eq('id', parsedInput.data.lesson_id);

  if (error) {
    return { error: error.message ?? 'No se pudo guardar el contenido.' };
  }

  const { data: location } = await dataClient
    .from('locations')
    .select('id, slug, group_id')
    .eq('id', module.location_id)
    .maybeSingle();

  const { data: group } = location
    ? await dataClient
        .from('groups')
        .select('id, slug')
        .eq('id', location.group_id)
        .maybeSingle()
    : { data: null };

  if (location && group) {
    const basePath = `/${group.slug}/${location.slug}/courses/${module.id}`;
    revalidatePath(`${basePath}/lessons`);
    revalidatePath(`${basePath}/lessons/${lesson.id}`);
  }

  return { error: null };
}
