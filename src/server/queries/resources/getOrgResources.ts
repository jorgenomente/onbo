'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type OrgResource = {
  id: string;
  title: string;
  type: 'link' | 'video' | 'pdf';
  url: string;
  description: string | null;
  order_index: number;
};

export async function getOrgResources(orgId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('org_resources')
    .select('id, title, type, url, description, order_index')
    .eq('org_id', orgId)
    .order('order_index', { ascending: true });

  return (data ?? []) as OrgResource[];
}
