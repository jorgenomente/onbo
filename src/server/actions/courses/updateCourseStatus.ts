'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const statusSchema = z.object({
  courseId: z.string().uuid(),
  status: z.enum(['active', 'archived']),
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

export async function updateCourseStatus(input: {
  courseId: string;
  status: 'active' | 'archived';
  revalidatePathname?: string;
}) {
  const parsed = statusSchema.safeParse(input);
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

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][status-update] request', {
      courseId: parsed.data.courseId,
      nextStatus: parsed.data.status,
      revalidatePathname: parsed.data.revalidatePathname ?? null,
      userId: user.id,
    });
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
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.courseId);

  const { data, error } = isSuperAdmin
    ? await updateQuery.select('id, status').single()
    : await updateQuery
        .eq('org_id', profile?.org_id ?? '')
        .select('id, status')
        .single();

  if (error || !data) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[courses][status-update][error]', {
        message: error?.message ?? null,
        code: error?.code ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
      });
    }
    throw new Error(error?.message ?? 'No se pudo actualizar el curso.');
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][status-update] ok', {
      courseId: data.id,
      status: data.status,
    });
  }

  if (parsed.data.revalidatePathname) {
    revalidatePath(parsed.data.revalidatePathname);
  }

  return { id: data.id, status: data.status as 'active' | 'archived' };
}
