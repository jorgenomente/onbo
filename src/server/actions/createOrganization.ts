'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { organizationSchema } from '@/lib/validators/organization.schema';

export type CreateOrganizationState = {
  error: string | null;
};

export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  console.log('[create-org] getUser error:', error);
  console.log('[create-org] user id:', data?.user?.id);
  console.log('[create-org] user email:', data?.user?.email);

  if (error || !data.user) {
    redirect('/login');
  }

  const name = formData.get('name');
  const slug = formData.get('slug');

  if (typeof name !== 'string' || typeof slug !== 'string') {
    return { error: 'Datos inválidos. Revisá los campos.' };
  }

  const result = organizationSchema.safeParse({ name, slug });

  if (!result.success) {
    const message =
      result.error.flatten().fieldErrors.name?.[0] ??
      result.error.flatten().fieldErrors.slug?.[0] ??
      'Datos inválidos. Revisá los campos.';
    return { error: message };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: result.data.name,
      slug: result.data.slug,
    })
    .select('id')
    .single();

  if (orgError) {
    if (orgError.code === '23505') {
      return { error: 'Ese slug ya está en uso.' };
    }

    console.error('createOrganization insert error:', orgError);
    return { error: orgError.message || 'No se pudo crear la organización.' };
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: data.user.id,
      org_id: org.id,
      role: 'org_admin',
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    console.error('createOrganization profile upsert error:', profileError);
    return { error: profileError.message || 'No se pudo asignar la organización al usuario.' };
  }

  redirect('/dashboard');
}
