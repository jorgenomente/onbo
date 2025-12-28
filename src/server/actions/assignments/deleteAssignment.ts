'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const deleteAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  module_id: z.string().uuid().optional(),
});

export async function deleteAssignment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const parsed = deleteAssignmentSchema.safeParse({
    assignment_id: formData.get('assignment_id'),
    module_id: formData.get('module_id') ?? undefined,
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('assignments')
    .delete()
    .eq('id', parsed.data.assignment_id)
    .eq('org_id', profile.org_id);

  revalidatePath('/assignments');
  if (parsed.data.module_id) {
    revalidatePath(`/modules/${parsed.data.module_id}`);
  }
}
