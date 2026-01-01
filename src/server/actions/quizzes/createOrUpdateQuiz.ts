'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateOrUpdateQuizState = { error: string | null };

const quizSchema = z
  .object({
    module_id: z.string().uuid().optional().nullable(),
    unit_id: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(2).max(120),
    passing_score: z.coerce.number().int().min(0).max(100),
  })
  .refine(
    (data) =>
      (data.module_id && !data.unit_id) || (!data.module_id && data.unit_id),
    {
      message: 'Define el modulo o la unidad.',
    },
  );

export async function createOrUpdateQuiz(
  formDataOrState: FormData | CreateOrUpdateQuizState,
  maybeFormData?: FormData,
): Promise<CreateOrUpdateQuizState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const parsed = quizSchema.safeParse({
    module_id: formData.get('module_id'),
    unit_id: formData.get('unit_id'),
    title: formData.get('title'),
    passing_score: formData.get('passing_score'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  let moduleId = parsed.data.module_id ?? null;
  let unitId = parsed.data.unit_id ?? null;

  if (unitId) {
    const { data: unitData } = await supabase
      .from('module_units')
      .select('id, module_id')
      .eq('id', unitId)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!unitData) {
      return { error: 'Unidad no encontrada.' };
    }
    moduleId = unitData.module_id;
  } else if (moduleId) {
    const { data: moduleData } = await supabase
      .from('modules')
      .select('id')
      .eq('id', moduleId)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!moduleData) {
      return { error: 'Curso no encontrado.' };
    }
  }

  const { data: existingQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('org_id', profile.org_id)
    .eq('module_id', parsed.data.module_id ?? null)
    .eq('unit_id', parsed.data.unit_id ?? null)
    .maybeSingle();

  const { error } = existingQuiz
    ? await supabase
        .from('quizzes')
        .update({
          title: parsed.data.title,
          passing_score: parsed.data.passing_score,
        })
        .eq('id', existingQuiz.id)
        .eq('org_id', profile.org_id)
    : await supabase.from('quizzes').insert({
        org_id: profile.org_id,
        module_id: parsed.data.module_id ?? null,
        unit_id: parsed.data.unit_id ?? null,
        title: parsed.data.title,
        passing_score: parsed.data.passing_score,
      });

  if (error) {
    return { error: error.message ?? 'No se pudo guardar el quiz.' };
  }

  if (moduleId) {
    revalidatePath(`/admin/courses/${moduleId}/quiz`);
    revalidatePath(`/modules/${moduleId}/quiz`);
  }
  if (unitId) {
    revalidatePath(`/admin/courses/${moduleId}/units/${unitId}/quiz`);
    revalidatePath(`/modules/${moduleId}/units/${unitId}/quiz`);
  }
  return { error: null };
}
