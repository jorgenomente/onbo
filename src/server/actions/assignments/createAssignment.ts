'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assignmentSchema } from '@/lib/validators/assignment.schema';

export type CreateAssignmentState = {
  error: string | null;
};

export async function createAssignment(
  formDataOrState: FormData | CreateAssignmentState,
  maybeFormData?: FormData,
): Promise<CreateAssignmentState> {
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

  const parsed = assignmentSchema.safeParse({
    user_id: formData.get('user_id'),
    module_id: formData.get('module_id'),
    due_date: formData.get('due_date') || null,
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

  const { data: moduleData, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .single();

  if (moduleError || !moduleData) {
    return { error: 'Módulo no encontrado.' };
  }

  const { error: insertError } = await supabase.from('assignments').upsert(
    {
      org_id: profile.org_id,
      user_id: parsed.data.user_id,
      module_id: parsed.data.module_id,
      assigned_by: profile.user_id,
      due_date: parsed.data.due_date,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,user_id,module_id' },
  );

  if (insertError) {
    return { error: insertError.message ?? 'No se pudo asignar el módulo.' };
  }

  revalidatePath('/assignments');
  revalidatePath(`/modules/${parsed.data.module_id}`);
  return { error: null };
}
