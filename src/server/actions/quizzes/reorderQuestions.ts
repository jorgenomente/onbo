'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ReorderQuestionsState = { error: string | null };

const reorderSchema = z.object({
  question_id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

export async function reorderQuestions(payload: {
  question_id: string;
  direction: 'up' | 'down';
}): Promise<ReorderQuestionsState> {
  const parsed = reorderSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: question } = await supabase
    .from('questions')
    .select('id, quiz_id, order_index')
    .eq('id', parsed.data.question_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!question) {
    return { error: 'Pregunta no encontrada.' };
  }

  const neighborQuery = supabase
    .from('questions')
    .select('id, order_index')
    .eq('quiz_id', question.quiz_id)
    .eq('org_id', profile.org_id);

  const { data: neighbor } =
    parsed.data.direction === 'up'
      ? await neighborQuery
          .lt('order_index', question.order_index ?? 0)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt('order_index', question.order_index ?? 0)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

  if (!neighbor) {
    return { error: null };
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('module_id')
    .eq('id', question.quiz_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!quiz) {
    return { error: 'Quiz no encontrado.' };
  }

  const { error: updateQuestionError } = await supabase
    .from('questions')
    .update({ order_index: neighbor.order_index })
    .eq('id', question.id)
    .eq('org_id', profile.org_id);

  const { error: updateNeighborError } = await supabase
    .from('questions')
    .update({ order_index: question.order_index })
    .eq('id', neighbor.id)
    .eq('org_id', profile.org_id);

  if (updateQuestionError || updateNeighborError) {
    return { error: 'No se pudo reordenar la pregunta.' };
  }

  revalidatePath(`/admin/courses/${quiz.module_id}/quiz`);
  return { error: null };
}
