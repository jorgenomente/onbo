'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const createSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
});

function normalizeSlug(rawSlug: string) {
  const trimmed = rawSlug.trim().toLowerCase();
  const spaced = trimmed.replace(/\s+/g, '-');
  const cleaned = spaced.replace(/[^a-z0-9-]/g, '');
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function createLocationForGroup(input: {
  groupId: string;
  name: string;
  slug: string;
}) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  await requireSuperAdmin();

  const normalizedSlug = normalizeSlug(parsed.data.slug);
  if (!normalizedSlug) {
    throw new Error('Slug invalido.');
  }

  const supabase = createServiceRoleClient();
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('id', parsed.data.groupId)
    .maybeSingle();

  if (!group) {
    throw new Error('Group no encontrado.');
  }

  const { error } = await supabase.from('locations').insert({
    group_id: parsed.data.groupId,
    name: parsed.data.name.trim(),
    slug: normalizedSlug,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] create location', error);
    }
    if (error.code === '23505') {
      throw new Error('Ya existe un local con ese slug.');
    }
    throw new Error(error.message ?? 'No se pudo crear el local.');
  }

  revalidatePath(`/onbo/groups/${parsed.data.groupId}`);
}
