'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { lessonSchema } from '@/lib/validators/lesson.schema';

export type UpdateLessonState = {
  error: string | null;
};

const updateLessonSchema = lessonSchema.extend({
  lesson_id: z.string().uuid(),
});

export async function updateLesson(
  formDataOrState: FormData | UpdateLessonState,
  maybeFormData?: FormData,
): Promise<UpdateLessonState> {
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

  const payload = {
    lesson_id: formData.get('lesson_id'),
    title: formData.get('title'),
  };

  const parsed = updateLessonSchema.safeParse({
    lesson_id: typeof payload.lesson_id === 'string' ? payload.lesson_id : '',
    title: typeof payload.title === 'string' ? payload.title : '',
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('lessons')
    .update({
      title: parsed.data.title,
    })
    .eq('id', parsed.data.lesson_id)
    .eq('org_id', profile.org_id)
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'No se pudo actualizar la lección.' };
  }

  return { error: null };
}
