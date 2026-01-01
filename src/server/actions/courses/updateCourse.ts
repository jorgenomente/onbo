'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { courseSchema } from '@/lib/validators/course.schema';

export type UpdateCourseState = {
  error: string | null;
};

const updateCourseSchema = courseSchema.extend({
  course_id: z.string().uuid(),
  status: z.enum(['active', 'archived']).optional(),
});

export async function updateCourse(
  formDataOrState: FormData | UpdateCourseState,
  maybeFormData?: FormData,
): Promise<UpdateCourseState> {
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

  const parsed = updateCourseSchema.safeParse({
    course_id: formData.get('course_id'),
    title: formData.get('title'),
    description: formData.get('description') || null,
    interval_days_default: Number(formData.get('interval_days_default')),
    status: formData.get('status') || 'active',
  });

  if (!parsed.success) {
    return { error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('courses')
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      interval_days_default: parsed.data.interval_days_default,
      status: parsed.data.status,
    })
    .eq('id', parsed.data.course_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo actualizar el curso.' };
  }

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return { error: null };
}
