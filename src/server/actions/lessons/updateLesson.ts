'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type UpdateLessonState = { error: string | null };

const updateLessonSchema = z.object({
  lesson_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
});

const updateLocationLessonSchema = z.object({
  lesson_id: z.string().uuid(),
  course_id: z.string().uuid(),
  location_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  content_json: z.string().trim().optional(),
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

export async function updateLesson(
  formDataOrState: FormData | UpdateLessonState,
  maybeFormData?: FormData,
): Promise<UpdateLessonState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const locationId = formData.get('location_id');
  if (locationId) {
    const parsed = updateLocationLessonSchema.safeParse({
      lesson_id: formData.get('lesson_id'),
      course_id: formData.get('course_id'),
      location_id: locationId,
      title: formData.get('title'),
      content_json: formData.get('content_json'),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.',
      };
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
      .select('id, module_id')
      .eq('id', parsed.data.lesson_id)
      .maybeSingle();

    if (!lesson || lesson.module_id !== parsed.data.course_id) {
      return { error: 'Leccion no encontrada.' };
    }

    let contentJson: unknown = null;
    if (typeof parsed.data.content_json === 'string') {
      const rawContent = parsed.data.content_json.trim();
      if (rawContent.length) {
        try {
          contentJson = JSON.parse(rawContent);
        } catch {
          return { error: 'Contenido JSON invalido.' };
        }
      } else {
        contentJson = [];
      }
    }

    const { error } = await dataClient
      .from('lessons')
      .update({
        title: parsed.data.title.trim(),
        content_json: contentJson ?? [],
      })
      .eq('id', parsed.data.lesson_id);

    if (error) {
      return { error: error.message ?? 'No se pudo actualizar la leccion.' };
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
      const basePath = `/${group.slug}/${location.slug}/courses/${module.id}`;
      revalidatePath(`${basePath}/lessons`);
      revalidatePath(`${basePath}/lessons/${parsed.data.lesson_id}`);
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

  const parsed = updateLessonSchema.safeParse({
    lesson_id: formData.get('lesson_id'),
    title: formData.get('title'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, module_id')
    .eq('id', parsed.data.lesson_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!lesson) {
    return { error: 'Leccion no encontrada.' };
  }

  const { error } = await supabase
    .from('lessons')
    .update({ title: parsed.data.title })
    .eq('id', parsed.data.lesson_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo actualizar la leccion.' };
  }

  revalidatePath(`/admin/courses/${lesson.module_id}`);
  revalidatePath(`/modules/${lesson.module_id}`);
  return { error: null };
}
