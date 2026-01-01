'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { resourceSchema } from './resourceSchemas';

export type UpsertOrgResourceState = { error: string | null };

const upsertSchema = resourceSchema.extend({
  resource_id: z.string().uuid().optional().nullable(),
});

export async function upsertOrgResource(
  formDataOrState: FormData | UpsertOrgResourceState,
  maybeFormData?: FormData,
): Promise<UpsertOrgResourceState> {
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

  const parsed = upsertSchema.safeParse({
    resource_id: formData.get('resource_id'),
    title: formData.get('title'),
    type: formData.get('type'),
    url: formData.get('url'),
    description: formData.get('description'),
    order_index: formData.get('order_index') ?? 0,
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    org_id: profile.org_id,
    title: parsed.data.title,
    type: parsed.data.type,
    url: parsed.data.url,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
    updated_at: new Date().toISOString(),
  };

  const { error } = parsed.data.resource_id
    ? await supabase
        .from('org_resources')
        .update(payload)
        .eq('id', parsed.data.resource_id)
        .eq('org_id', profile.org_id)
    : await supabase.from('org_resources').insert(payload);

  if (error) {
    return { error: error.message ?? 'No se pudo guardar el recurso.' };
  }

  revalidatePath('/admin/resources');
  revalidatePath('/resources');
  return { error: null };
}
