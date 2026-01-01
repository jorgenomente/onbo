'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type ReorderLessonsState = { error: string | null };

const reorderLessonsSchema = z.object({
  lesson_id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

const reorderLocationLessonsSchema = z.object({
  lesson_id: z.string().uuid(),
  course_id: z.string().uuid(),
  location_id: z.string().uuid(),
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

export async function reorderLessons(
  formDataOrState: FormData | ReorderLessonsState,
  maybeFormData?: FormData,
): Promise<ReorderLessonsState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const locationId = formData.get('location_id');
  if (locationId) {
    const parsed = reorderLocationLessonsSchema.safeParse({
      lesson_id: formData.get('lesson_id'),
      course_id: formData.get('course_id'),
      location_id: locationId,
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

    const { data: lesson } = await dataClient
      .from('lessons')
      .select('id, module_id, unit_id, order_index')
      .eq('id', parsed.data.lesson_id)
      .maybeSingle();

    if (!lesson || lesson.module_id !== parsed.data.course_id) {
      return { error: 'Leccion no encontrada.' };
    }

    const neighborQuery = dataClient
      .from('lessons')
      .select('id, order_index')
      .eq('module_id', parsed.data.course_id);

    if (lesson.unit_id) {
      neighborQuery.eq('unit_id', lesson.unit_id);
    }

    const { data: neighbor } =
      parsed.data.direction === 'up'
        ? await neighborQuery
            .lt('order_index', lesson.order_index ?? 0)
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await neighborQuery
            .gt('order_index', lesson.order_index ?? 0)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

    if (!neighbor) {
      return { error: null };
    }

    const { error: updateLessonError } = await dataClient
      .from('lessons')
      .update({ order_index: neighbor.order_index })
      .eq('id', lesson.id);

    const { error: updateNeighborError } = await dataClient
      .from('lessons')
      .update({ order_index: lesson.order_index })
      .eq('id', neighbor.id);

    if (updateLessonError || updateNeighborError) {
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

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const parsed = reorderLessonsSchema.safeParse({
    lesson_id: formData.get('lesson_id'),
    direction: formData.get('direction'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, module_id, unit_id, order_index')
    .eq('id', parsed.data.lesson_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!lesson || !lesson.unit_id) {
    return { error: 'Leccion no encontrada.' };
  }

  const neighborQuery = supabase
    .from('lessons')
    .select('id, order_index')
    .eq('unit_id', lesson.unit_id)
    .eq('org_id', profile.org_id);

  const { data: neighbor } =
    parsed.data.direction === 'up'
      ? await neighborQuery
          .lt('order_index', lesson.order_index ?? 0)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt('order_index', lesson.order_index ?? 0)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

  if (!neighbor) {
    return { error: null };
  }

  const { error: updateLessonError } = await supabase
    .from('lessons')
    .update({ order_index: neighbor.order_index })
    .eq('id', lesson.id)
    .eq('org_id', profile.org_id);

  const { error: updateNeighborError } = await supabase
    .from('lessons')
    .update({ order_index: lesson.order_index })
    .eq('id', neighbor.id)
    .eq('org_id', profile.org_id);

  if (updateLessonError || updateNeighborError) {
    return { error: 'No se pudo reordenar la leccion.' };
  }

  revalidatePath(`/admin/courses/${lesson.module_id}`);
  revalidatePath(`/modules/${lesson.module_id}`);
  return { error: null };
}
