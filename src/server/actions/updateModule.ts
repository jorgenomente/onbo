'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { moduleSchema } from '@/lib/validators/module.schema';

export type UpdateModuleState = {
  error: string | null;
};

const updateModuleSchema = moduleSchema.extend({
  module_id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']),
});

export async function updateModule(
  formDataOrState: FormData | UpdateModuleState,
  maybeFormData?: FormData,
): Promise<UpdateModuleState> {
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

  const payload = {
    module_id: formData.get('module_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
  };

  const parsed = updateModuleSchema.safeParse({
    module_id: typeof payload.module_id === 'string' ? payload.module_id : '',
    title: typeof payload.title === 'string' ? payload.title : '',
    description:
      typeof payload.description === 'string' && payload.description.length > 0
        ? payload.description
        : null,
    status: typeof payload.status === 'string' ? payload.status : 'draft',
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos inválidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('modules')
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
    })
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'No se pudo actualizar el módulo.' };
  }

  return { error: null };
}
