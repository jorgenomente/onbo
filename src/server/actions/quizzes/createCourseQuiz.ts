'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
});

export async function createCourseQuiz(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  title: string;
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

  const { data: existing } = await adminClient
    .from('quizzes')
    .select('id')
    .eq('module_id', course.id)
    .maybeSingle();

  if (existing) {
    throw new Error('El quiz ya existe.');
  }

  const { error } = await adminClient.from('quizzes').insert({
    org_id: course.org_id,
    module_id: course.id,
    title: parsed.data.title,
    status: 'draft',
  });

  if (error) {
    throw new Error(error.message ?? 'No se pudo crear el quiz.');
  }
}
