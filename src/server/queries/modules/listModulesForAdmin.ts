'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AdminModuleListItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export async function listModulesForAdmin(orgId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('modules')
    .select('id, title, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminModuleListItem[];
}
