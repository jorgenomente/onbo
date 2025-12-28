'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { moduleSchema } from '@/lib/validators/module.schema';

export type CreateModuleState = {
  error: string | null;
};

const createModuleSchema = moduleSchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export async function createModule(
  _prevState: CreateModuleState,
  formData: FormData,
): Promise<CreateModuleState> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const payload = {
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
  };

  const parsed = createModuleSchema.safeParse({
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
    .insert({
      org_id: profile.org_id,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status ?? 'draft',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'No se pudo crear el módulo.' };
  }

  redirect(`/modules/${data.id}`);
}
