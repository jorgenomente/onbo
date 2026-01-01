'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
});

function normalizeSlug(rawSlug: string) {
  const trimmed = rawSlug.trim().toLowerCase();
  const spaced = trimmed.replace(/\s+/g, '-');
  const cleaned = spaced.replace(/[^a-z0-9-]/g, '');
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function createGroup(input: { name: string; slug: string }) {
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
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: parsed.data.name.trim(),
      slug: normalizedSlug,
    })
    .select('id, name, slug')
    .single();

  if (error || !data) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] create group', error);
    }
    if (error.code === '23505') {
      throw new Error('Ya existe un group con ese slug.');
    }
    throw new Error(error?.message ?? 'No se pudo crear el group.');
  }

  revalidatePath('/onbo');
  return data;
}
