'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { courseSchema } from '@/lib/validators/course.schema';

export type CreateCourseState = {
  error: string | null;
};

export async function createCourse(
  formDataOrState: FormData | CreateCourseState,
  maybeFormData?: FormData,
): Promise<CreateCourseState> {
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

  const parsed = courseSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    interval_days_default: Number(formData.get('interval_days_default')),
    status: formData.get('status') || 'active',
  });

  if (!parsed.success) {
    return { error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    org_id: profile.org_id,
    title: parsed.data.title,
    description: parsed.data.description,
    interval_days_default: parsed.data.interval_days_default,
    status: parsed.data.status ?? 'active',
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][create]', {
      userId: profile.user_id,
      orgId: profile.org_id,
      payload,
    });
    console.trace('[courses][create] stack');
  }

  const { data, error } = await supabase
    .from('courses')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[courses][create][error]', {
        message: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
      });
    }
    return { error: error.message ?? 'No se pudo crear el curso.' };
  }

  if (!data) {
    return { error: 'No se pudo crear el curso.' };
  }

  revalidatePath('/admin/courses');
  redirect(`/admin/courses/${data.id}`);

  return { error: null };
}
