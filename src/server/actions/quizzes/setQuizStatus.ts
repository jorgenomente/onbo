'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  quizId: z.string().uuid(),
  status: z.enum(['draft', 'published']),
});

export async function setQuizStatus(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  quizId: string;
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
  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, module_id')
    .eq('id', parsed.data.quizId)
    .maybeSingle();

  if (!quiz || quiz.module_id !== parsed.data.courseId) {
    throw new Error('Quiz no encontrado.');
  }

  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== access.location.id) {
    throw new Error('Curso no encontrado.');
  }

  const { error } = await adminClient
    .from('quizzes')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.quizId);

  if (error) {
    throw new Error(error.message ?? 'No se pudo actualizar el quiz.');
  }
}
