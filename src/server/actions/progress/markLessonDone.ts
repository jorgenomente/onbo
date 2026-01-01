'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type MarkLessonDoneState = { error: string | null };

const markLessonDoneSchema = z.object({
  module_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
});

export async function markLessonDone(
  formDataOrState: FormData | MarkLessonDoneState,
  maybeFormData?: FormData,
): Promise<MarkLessonDoneState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  const allowed = profile.role === 'employee' || isAdminLike(profile.role);
  if (!allowed) {
    return { error: 'No autorizado.' };
  }

  const parsed = markLessonDoneSchema.safeParse({
    module_id: formData.get('module_id'),
    lesson_id: formData.get('lesson_id'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, module_id')
    .eq('id', parsed.data.lesson_id)
    .eq('module_id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!lesson) {
    return { error: 'Leccion no encontrada.' };
  }

  const { error } = await supabase.from('progress').upsert(
    {
      org_id: profile.org_id,
      user_id: profile.user_id,
      module_id: parsed.data.module_id,
      lesson_id: parsed.data.lesson_id,
      status: 'done',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,user_id,module_id,lesson_id' },
  );

  if (error) {
    return { error: error.message ?? 'No se pudo guardar el progreso.' };
  }

  revalidatePath(`/modules/${parsed.data.module_id}`);
  revalidatePath('/home');

  return { error: null };
}
