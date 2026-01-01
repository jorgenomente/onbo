'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const createSchema = z.object({
  groupId: z.string().uuid(),
  groupSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
});

function normalizeSlug(rawSlug: string) {
  const trimmed = rawSlug.trim().toLowerCase();
  const spaced = trimmed.replace(/\s+/g, '-');
  const cleaned = spaced.replace(/[^a-z0-9-]/g, '');
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function createLocationUnderGroup(input: {
  groupId: string;
  groupSlug: string;
  name: string;
  slug: string;
}) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const normalizedSlug = normalizeSlug(parsed.data.slug);
  if (!normalizedSlug) {
    throw new Error('Slug invalido.');
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  if (!isSuperAdmin) {
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', parsed.data.groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'group_admin') {
      throw new Error('No autorizado.');
    }
  }

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;
  const { error } = await dataClient.from('locations').insert({
    group_id: parsed.data.groupId,
    name: parsed.data.name.trim(),
    slug: normalizedSlug,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[groups] create location', error);
    }
    if (error.code === '23505') {
      throw new Error('Ya existe un local con ese slug.');
    }
    throw new Error(error.message ?? 'No se pudo crear el local.');
  }

  revalidatePath(`/${parsed.data.groupSlug}`);
}
