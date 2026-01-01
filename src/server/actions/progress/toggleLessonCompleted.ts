'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { progressSchema } from '@/lib/validators/progress.schema';

export type ToggleLessonCompletedState = {
  error: string | null;
};

export async function toggleLessonCompleted(
  formDataOrState: FormData | ToggleLessonCompletedState,
  maybeFormData?: FormData,
): Promise<ToggleLessonCompletedState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos inválidos.' };
  }
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile) {
    redirect('/login');
  }

  const parsed = progressSchema.safeParse({
    lesson_id: formData.get('lesson_id'),
    module_id: formData.get('module_id'),
    completed: formData.get('completed') === 'true',
  });

  if (!parsed.success) {
    return { error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, module_id, org_id')
    .eq('id', parsed.data.lesson_id)
    .eq('module_id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .single();

  if (lessonError || !lesson) {
    return { error: 'Lección no encontrada.' };
  }

  if (!isAdminLike(profile.role)) {
    const { data: moduleData } = await supabase
      .from('modules')
      .select('status')
      .eq('id', parsed.data.module_id)
      .single();

    if (!moduleData || moduleData.status !== 'published') {
      return { error: 'Módulo no disponible.' };
    }
  }

  if (parsed.data.completed) {
    const { error } = await supabase.from('progress').upsert(
      {
        org_id: profile.org_id,
        user_id: user.id,
        module_id: parsed.data.module_id,
        lesson_id: parsed.data.lesson_id,
        status: 'done',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    );

    if (error) {
      return { error: error.message ?? 'No se pudo guardar el progreso.' };
    }
  } else {
    const { error } = await supabase
      .from('progress')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', parsed.data.lesson_id)
      .eq('org_id', profile.org_id);

    if (error) {
      return { error: error.message ?? 'No se pudo actualizar el progreso.' };
    }
  }

  revalidatePath(`/modules/${parsed.data.module_id}`);
  revalidatePath('/home');

  return { error: null };
}
