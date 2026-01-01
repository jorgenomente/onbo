'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type RemoveMemberAssignmentState = { error: string | null };

const removeSchema = z.object({
  member_user_id: z.string().uuid(),
  module_id: z.string().uuid(),
});

export async function removeMemberAssignment(
  formDataOrState: FormData | RemoveMemberAssignmentState,
  maybeFormData?: FormData,
): Promise<RemoveMemberAssignmentState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const parsed = removeSchema.safeParse({
    member_user_id: formData.get('member_user_id'),
    module_id: formData.get('module_id'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('org_id', profile.org_id)
    .eq('user_id', parsed.data.member_user_id)
    .eq('module_id', parsed.data.module_id);

  if (error) {
    return { error: error.message ?? 'No se pudo remover el curso.' };
  }

  revalidatePath('/settings/members');
  revalidatePath('/home');
  return { error: null };
}
