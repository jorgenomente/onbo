'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  resourceId: z.string().uuid(),
});

export async function deleteCourseResource(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  resourceId: string;
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

  const access = await requireLocationAccess(
    parsed.data.groupSlug,
    parsed.data.locationSlug,
  );

  const canManage =
    access.roles.isGroupAdmin ||
    access.roles.locationRole === 'location_admin' ||
    access.roles.locationRole === 'trainer';

  if (!canManage) {
    throw new Error('No autorizado.');
  }

  const adminClient = createServiceRoleClient();
  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id, org_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== access.location.id || !course.org_id) {
    throw new Error('Curso no encontrado.');
  }

  const { error } = await adminClient
    .from('module_resources')
    .delete()
    .eq('id', parsed.data.resourceId)
    .eq('module_id', parsed.data.courseId)
    .eq('org_id', course.org_id);

  if (error) {
    throw new Error(error.message ?? 'No se pudo borrar el recurso.');
  }

  const basePath = `/${access.group.slug}/${access.location.slug}/courses/${course.id}`;
  revalidatePath(`${basePath}/resources`);
  revalidatePath(`${basePath}/view`);
}
