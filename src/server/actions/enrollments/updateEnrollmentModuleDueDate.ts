'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updateEnrollmentModuleSchema = z.object({
  enrollment_id: z.string().uuid(),
  module_id: z.string().uuid(),
  due_date: z.string(),
});

export async function updateEnrollmentModuleDueDate(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const parsed = updateEnrollmentModuleSchema.safeParse({
    enrollment_id: formData.get('enrollment_id'),
    module_id: formData.get('module_id'),
    due_date: formData.get('due_date'),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('enrollment_modules')
    .update({ due_date: parsed.data.due_date })
    .eq('enrollment_id', parsed.data.enrollment_id)
    .eq('module_id', parsed.data.module_id)
    .eq('org_id', profile.org_id);

  revalidatePath(`/admin/enrollments/${parsed.data.enrollment_id}`);
}
