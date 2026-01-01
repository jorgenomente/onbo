'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AssignCourseState = { error: string | null };

const assignSchema = z.object({
  member_user_id: z.string().uuid(),
  module_id: z.string().uuid(),
  due_date: z.string().optional().nullable(),
});

export async function assignCourse(
  formDataOrState:
    | FormData
    | AssignCourseState
    | { memberUserId: string; moduleId: string; dueDate?: string | null },
  maybeFormData?: FormData,
): Promise<AssignCourseState> {
  const isPayload =
    typeof formDataOrState === 'object' &&
    formDataOrState !== null &&
    'memberUserId' in formDataOrState;
  const formData =
    formDataOrState instanceof FormData
      ? formDataOrState
      : isPayload
        ? null
        : maybeFormData;

  let rawData: {
    member_user_id: FormDataEntryValue | string | null;
    module_id: FormDataEntryValue | string | null;
    due_date: FormDataEntryValue | string | null;
  };

  if (isPayload) {
    rawData = {
      member_user_id: formDataOrState.memberUserId,
      module_id: formDataOrState.moduleId,
      due_date: formDataOrState.dueDate ?? null,
    };
  } else {
    if (!formData) {
      return { error: 'Datos invalidos.' };
    }
    rawData = {
      member_user_id: formData.get('member_user_id'),
      module_id: formData.get('module_id'),
      due_date: formData.get('due_date'),
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const parsed = assignSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', parsed.data.member_user_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!member) {
    return { error: 'El usuario no pertenece a la organizacion.' };
  }

  const { data: moduleData } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!moduleData) {
    return { error: 'Curso no encontrado.' };
  }

  const { error } = await supabase
    .from('assignments')
    .upsert(
      {
        org_id: profile.org_id,
        user_id: parsed.data.member_user_id,
        module_id: parsed.data.module_id,
        assigned_by: profile.user_id,
        due_date: parsed.data.due_date || null,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,user_id,module_id' },
    );

  if (error) {
    return { error: error.message ?? 'No se pudo asignar el curso.' };
  }

  revalidatePath('/settings/members');
  return { error: null };
}
