'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const setCourseModulesSchema = z.object({
  course_id: z.string().uuid(),
  module_ids: z.array(z.string().uuid()),
});

export type SetCourseModulesState = {
  error: string | null;
};

export async function setCourseModules(
  formDataOrState: FormData | SetCourseModulesState,
  maybeFormData?: FormData,
): Promise<SetCourseModulesState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos inválidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const courseId = formData.get('course_id');
  const moduleIds = formData.getAll('module_id').filter(Boolean) as string[];

  const parsed = setCourseModulesSchema.safeParse({
    course_id: courseId,
    module_ids: moduleIds,
  });

  if (!parsed.success) {
    return { error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.module_ids.length > 0) {
    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .in('id', parsed.data.module_ids)
      .eq('org_id', profile.org_id);

    if (moduleError || (modules?.length ?? 0) !== parsed.data.module_ids.length) {
      return { error: 'Algún módulo no pertenece a la organización.' };
    }
  }

  const rows = parsed.data.module_ids.map((moduleId) => {
    const orderValue = formData.get(`order_${moduleId}`);
    const orderIndex = orderValue ? Number(orderValue) : 0;

    return {
      org_id: profile.org_id,
      course_id: parsed.data.course_id,
      module_id: moduleId,
      order_index: Number.isNaN(orderIndex) ? 0 : orderIndex,
    };
  });

  const { data: existing } = await supabase
    .from('course_modules')
    .select('module_id')
    .eq('course_id', parsed.data.course_id)
    .eq('org_id', profile.org_id);

  const existingIds = new Set((existing ?? []).map((row) => row.module_id));
  const nextIds = new Set(parsed.data.module_ids);
  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (toDelete.length > 0) {
    await supabase
      .from('course_modules')
      .delete()
      .eq('course_id', parsed.data.course_id)
      .eq('org_id', profile.org_id)
      .in('module_id', toDelete);
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('course_modules')
      .upsert(rows, { onConflict: 'course_id,module_id' });

    if (upsertError) {
      return { error: upsertError.message ?? 'No se pudo guardar módulos.' };
    }
  }

  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return { error: null };
}
