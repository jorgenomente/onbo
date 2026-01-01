'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const archiveCourseSchema = z.object({
  course_id: z.string().uuid(),
});

export async function archiveCourse(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const parsed = archiveCourseSchema.safeParse({
    course_id: formData.get('course_id'),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('courses')
    .update({ status: 'archived' })
    .eq('id', parsed.data.course_id)
    .eq('org_id', profile.org_id);

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
}
