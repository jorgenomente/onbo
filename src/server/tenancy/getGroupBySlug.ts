'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GroupRecord = {
  id: string;
  name: string;
  slug: string;
};

const slugSchema = z.string().trim().min(1);

export async function getGroupBySlug(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('groups')
    .select('id, name, slug')
    .eq('slug', parsed.data)
    .maybeSingle();

  return (data ?? null) as GroupRecord | null;
}
