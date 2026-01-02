'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const renameSchema = z.object({
  courseId: z.string().uuid(),
  newTitle: z.string().trim().min(1).max(120),
  revalidatePathname: z.string().optional(),
});

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function renameCourse(input: {
  courseId: string;
  newTitle: string;
  revalidatePathname?: string;
}) {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  const profile = await getCurrentProfile();
  if (!isSuperAdmin) {
    if (!profile?.org_id || !isAdminLike(profile.role)) {
      throw new Error('No autorizado.');
    }
  }

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;
  const updateQuery = dataClient
    .from('courses')
    .update({ title: parsed.data.newTitle })
    .eq('id', parsed.data.courseId);

  const { data, error } = isSuperAdmin
    ? await updateQuery.select('id, title').single()
    : await updateQuery
        .eq('org_id', profile?.org_id ?? '')
        .select('id, title')
        .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar el curso.');
  }

  if (parsed.data.revalidatePathname) {
    revalidatePath(parsed.data.revalidatePathname);
  }

  return { id: data.id, title: data.title };
}
