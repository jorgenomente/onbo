'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type CreateLessonState = { error: string | null };

const createLessonSchema = z.object({
  module_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
});

const createLocationLessonSchema = z.object({
  module_id: z.string().uuid(),
  location_id: z.string().uuid(),
  unit_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(120),
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

export async function createLesson(
  formDataOrState: FormData | CreateLessonState,
  maybeFormData?: FormData,
): Promise<CreateLessonState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const locationId = formData.get('location_id');
  if (locationId) {
    const parsed = createLocationLessonSchema.safeParse({
      module_id: formData.get('module_id'),
      location_id: locationId,
      unit_id: formData.get('unit_id'),
      title: formData.get('title'),
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
      .select('id, location_id, group_id, org_id')
      .eq('id', parsed.data.module_id)
      .maybeSingle();

    if (!module || module.location_id !== parsed.data.location_id) {
      return { error: 'Curso no encontrado.' };
    }

    if (parsed.data.unit_id) {
      const { data: unit } = await dataClient
        .from('module_units')
        .select('id, module_id')
        .eq('id', parsed.data.unit_id)
        .eq('module_id', parsed.data.module_id)
        .maybeSingle();

      if (!unit) {
        return { error: 'Unidad no encontrada.' };
      }
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

    const lastLessonQuery = dataClient
      .from('lessons')
      .select('order_index')
      .eq('module_id', parsed.data.module_id);

    if (parsed.data.unit_id) {
      lastLessonQuery.eq('unit_id', parsed.data.unit_id);
    }

    const { data: lastLesson } = await lastLessonQuery
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (lastLesson?.order_index ?? 0) + 1;

    const { error } = await dataClient.from('lessons').insert({
      org_id: module.org_id,
      module_id: parsed.data.module_id,
      unit_id: parsed.data.unit_id ?? null,
      title: parsed.data.title.trim(),
      order_index: nextOrder,
      content_json: [],
    });

    if (error) {
      return { error: error.message ?? 'No se pudo crear la leccion.' };
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

  const rawUnitId = formData.get('unit_id');
  if (rawUnitId) {
    const profile = await getCurrentProfile();
    if (!profile) {
      redirect('/login');
    }

    if (!isAdminLike(profile.role)) {
      return { error: 'No autorizado.' };
    }

    const parsed = createLessonSchema.safeParse({
      module_id: formData.get('module_id'),
      unit_id: rawUnitId,
      title: formData.get('title'),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.',
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data: unit } = await supabase
      .from('module_units')
      .select('id, module_id')
      .eq('id', parsed.data.unit_id)
      .eq('module_id', parsed.data.module_id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!unit) {
      return { error: 'Unidad no encontrada.' };
    }

    const { data: lastLesson } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('unit_id', parsed.data.unit_id)
      .eq('org_id', profile.org_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (lastLesson?.order_index ?? 0) + 1;

    const { error } = await supabase.from('lessons').insert({
      org_id: profile.org_id,
      module_id: parsed.data.module_id,
      unit_id: parsed.data.unit_id,
      title: parsed.data.title,
      order_index: nextOrder,
      content_json: [],
    });

    if (error) {
      return { error: error.message ?? 'No se pudo crear la leccion.' };
    }

    revalidatePath(`/admin/courses/${parsed.data.module_id}`);
    revalidatePath(`/modules/${parsed.data.module_id}`);
    return { error: null };
  }

  return { error: 'Datos invalidos.' };
}
