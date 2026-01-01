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
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url(),
});

function inferResourceType(url: string): 'link' | 'video' | 'pdf' {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com')
  ) {
    return 'video';
  }
  return 'link';
}

export async function createCourseResource(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  name: string;
  url: string;
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

  const { error } = await adminClient.from('module_resources').insert({
    org_id: course.org_id,
    module_id: course.id,
    title: parsed.data.name,
    url: parsed.data.url,
    type: inferResourceType(parsed.data.url),
    order_index: 0,
  });

  if (error) {
    throw new Error(error.message ?? 'No se pudo guardar el recurso.');
  }

  const basePath = `/${access.group.slug}/${access.location.slug}/courses/${course.id}`;
  revalidatePath(`${basePath}/resources`);
  revalidatePath(`${basePath}/view`);
}
