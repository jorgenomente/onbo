'use server';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';

export type SuperadminGroup = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export async function listGroups() {
  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] list groups', error);
    }
    throw new Error(error.message ?? 'No se pudo cargar los groups.');
  }

  return (data ?? []) as SuperadminGroup[];
}
