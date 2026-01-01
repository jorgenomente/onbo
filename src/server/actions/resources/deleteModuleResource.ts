'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteModuleResourceState = { error: string | null };

const deleteSchema = z.object({
  resource_id: z.string().uuid(),
  module_id: z.string().uuid(),
});

export async function deleteModuleResource(
  formDataOrState: FormData | DeleteModuleResourceState,
  maybeFormData?: FormData,
): Promise<DeleteModuleResourceState> {
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

  const parsed = deleteSchema.safeParse({
    resource_id: formData.get('resource_id'),
    module_id: formData.get('module_id'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('module_resources')
    .delete()
    .eq('id', parsed.data.resource_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo eliminar el recurso.' };
  }

  revalidatePath(`/admin/courses/${parsed.data.module_id}/resources`);
  revalidatePath(`/modules/${parsed.data.module_id}`);
  revalidatePath(`/modules/${parsed.data.module_id}/resources`);
  return { error: null };
}
