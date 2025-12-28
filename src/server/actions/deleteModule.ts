'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const deleteModuleSchema = z.object({
  module_id: z.string().uuid(),
});

export async function deleteModule(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const payload = {
    module_id: formData.get('module_id'),
  };

  const parsed = deleteModuleSchema.safeParse({
    module_id: typeof payload.module_id === 'string' ? payload.module_id : '',
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('modules')
    .delete()
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id);

  redirect('/modules');
}
