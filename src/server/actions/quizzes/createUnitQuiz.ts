'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateUnitQuizState = { error: string | null };

const unitSchema = z.object({
  unit_id: z.string().uuid(),
});

export async function createUnitQuiz(
  formDataOrState: FormData | CreateUnitQuizState,
  maybeFormData?: FormData,
): Promise<CreateUnitQuizState> {
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

  const parsed = unitSchema.safeParse({
    unit_id: formData.get('unit_id'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: unit } = await supabase
    .from('module_units')
    .select('id, module_id, title')
    .eq('id', parsed.data.unit_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!unit) {
    return { error: 'Unidad no encontrada.' };
  }

  const { data: existingQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('org_id', profile.org_id)
    .eq('unit_id', unit.id)
    .is('module_id', null)
    .maybeSingle();

  if (!existingQuiz) {
    const { error } = await supabase.from('quizzes').insert({
      org_id: profile.org_id,
      unit_id: unit.id,
      module_id: null,
      title: `Quiz - ${unit.title}`,
      passing_score: 70,
    });

    if (error) {
      return { error: error.message ?? 'No se pudo crear el quiz.' };
    }
  }

  redirect(`/admin/courses/${unit.module_id}/units/${unit.id}/quiz`);
}
