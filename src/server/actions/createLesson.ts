'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { lessonSchema } from '@/lib/validators/lesson.schema';

export type CreateLessonState = {
  error: string | null;
};

const createLessonSchema = lessonSchema.extend({
  module_id: z.string().uuid(),
});

export async function createLesson(
  formDataOrState: FormData | CreateLessonState,
  maybeFormData?: FormData,
): Promise<CreateLessonState> {
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
    module_id: formData.get('module_id'),
    title: formData.get('title'),
  };

  const parsed = createLessonSchema.safeParse({
    module_id: typeof payload.module_id === 'string' ? payload.module_id : '',
    title: typeof payload.title === 'string' ? payload.title : '',
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: moduleData, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .single();

  if (moduleError || !moduleData) {
    return { error: 'Módulo no encontrado.' };
  }

  const { error } = await supabase.from('lessons').insert({
    org_id: profile.org_id,
    module_id: parsed.data.module_id,
    title: parsed.data.title,
  });

  if (error) {
    return { error: error.message ?? 'No se pudo crear la lección.' };
  }

  revalidatePath(`/modules/${parsed.data.module_id}`);
  return { error: null };
}
