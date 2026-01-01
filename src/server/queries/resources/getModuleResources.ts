'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ModuleResource = {
  id: string;
  module_id: string;
  title: string;
  type: 'link' | 'video' | 'pdf';
  url: string;
  description: string | null;
  order_index: number;
};

const moduleIdSchema = z.string().uuid();

export async function getModuleResources(moduleId: string, orgId: string) {
  const parsed = moduleIdSchema.safeParse(moduleId);
  if (!parsed.success) {
    return [] as ModuleResource[];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('module_resources')
    .select('id, module_id, title, type, url, description, order_index')
    .eq('org_id', orgId)
    .eq('module_id', parsed.data)
    .order('order_index', { ascending: true });

  return (data ?? []) as ModuleResource[];
}
