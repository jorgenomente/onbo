'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enrollmentSchema } from '@/lib/validators/enrollment.schema';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export type AssignCourseState = {
  error: string | null;
};

export async function assignCourseToUser(
  formDataOrState: FormData | AssignCourseState,
  maybeFormData?: FormData,
): Promise<AssignCourseState> {
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

  const parsed = enrollmentSchema.safeParse({
    user_id: formData.get('user_id'),
    course_id: formData.get('course_id'),
    interval_days: formData.get('interval_days')
      ? Number(formData.get('interval_days'))
      : undefined,
  });

  if (!parsed.success) {
    return { error: 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userProfile, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', parsed.data.user_id)
    .eq('org_id', profile.org_id)
    .single();

  if (userError || !userProfile) {
    return { error: 'El usuario no pertenece a la organización.' };
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, interval_days_default')
    .eq('id', parsed.data.course_id)
    .eq('org_id', profile.org_id)
    .single();

  if (courseError || !course) {
    return { error: 'Curso no encontrado.' };
  }

  await supabase
    .from('enrollments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('org_id', profile.org_id)
    .eq('user_id', parsed.data.user_id)
    .eq('status', 'active');

  const intervalDays = parsed.data.interval_days ?? course.interval_days_default;
  const startDate = new Date();
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .insert({
      org_id: profile.org_id,
      course_id: course.id,
      user_id: parsed.data.user_id,
      assigned_by: profile.user_id,
      start_date: startDate.toISOString().slice(0, 10),
      interval_days: intervalDays,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (enrollmentError || !enrollment) {
    return { error: enrollmentError?.message ?? 'No se pudo asignar curso.' };
  }

  const { data: courseModules } = await supabase
    .from('course_modules')
    .select('module_id, order_index')
    .eq('course_id', course.id)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: true });

  const rows =
    courseModules?.map((module) => ({
      org_id: profile.org_id,
      enrollment_id: enrollment.id,
      module_id: module.module_id,
      order_index: module.order_index,
      due_date: addDays(startDate, module.order_index * intervalDays),
    })) ?? [];

  if (rows.length > 0) {
    await supabase.from('enrollment_modules').insert(rows);
  }

  revalidatePath('/settings/members');
  revalidatePath(`/admin/enrollments/${enrollment.id}`);
  return { error: null };
}
