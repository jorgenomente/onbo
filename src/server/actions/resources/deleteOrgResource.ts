'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteOrgResourceState = { error: string | null };

const deleteSchema = z.object({
  resource_id: z.string().uuid(),
});

export async function deleteOrgResource(
  formDataOrState: FormData | DeleteOrgResourceState,
  maybeFormData?: FormData,
): Promise<DeleteOrgResourceState> {
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
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('org_resources')
    .delete()
    .eq('id', parsed.data.resource_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo eliminar el recurso.' };
  }

  revalidatePath('/admin/resources');
  revalidatePath('/resources');
  return { error: null };
}
