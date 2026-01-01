'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getLocationBySlugs } from '@/server/tenancy/getLocationBySlugs';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  status: z.enum(['draft', 'published']),
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

export async function setCourseStatus(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  status: 'draft' | 'published';
}) {
  const parsed = inputSchema.safeParse(input);
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

  const resolved = await getLocationBySlugs(
    parsed.data.groupSlug,
    parsed.data.locationSlug,
  );

  if (!resolved) {
    throw new Error('Local no encontrado.');
  }

  let canManageCourse = false;
  if (isSuperAdmin) {
    canManageCourse = true;
  } else {
    const { data: groupMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', resolved.group.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: locationMembership } = await supabase
      .from('location_memberships')
      .select('role')
      .eq('location_id', resolved.location.id)
      .eq('user_id', user.id)
      .maybeSingle();

    canManageCourse =
      groupMembership?.role === 'group_admin' ||
      locationMembership?.role === 'location_admin' ||
      locationMembership?.role === 'trainer';
  }

  if (!canManageCourse) {
    throw new Error('No autorizado.');
  }

  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;
  const { data: moduleRow } = await dataClient
    .from('modules')
    .select('id, location_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!moduleRow || moduleRow.location_id !== resolved.location.id) {
    throw new Error('Curso no encontrado.');
  }

  const { error } = await dataClient
    .from('modules')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.courseId)
    .eq('location_id', resolved.location.id);

  if (error) {
    throw new Error(error.message ?? 'No se pudo actualizar el curso.');
  }

  revalidatePath(
    `/${resolved.group.slug}/${resolved.location.slug}/courses`,
  );
  revalidatePath(
    `/${resolved.group.slug}/${resolved.location.slug}/courses/${parsed.data.courseId}`,
  );
  revalidatePath(
    `/${resolved.group.slug}/${resolved.location.slug}/courses/${parsed.data.courseId}/view`,
  );
}
