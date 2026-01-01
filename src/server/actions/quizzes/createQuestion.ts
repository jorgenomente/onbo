'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateQuestionState = { error: string | null };

const questionSchema = z.object({
  quiz_id: z.string().uuid(),
  prompt: z.string().trim().min(2),
  options: z.array(z.string().trim().min(1)).min(2),
  correct_index: z.number().int().min(0),
});

export async function createQuestion(
  payload: {
    quiz_id: string;
    prompt: string;
    options: string[];
    correct_index: number;
  },
): Promise<CreateQuestionState> {
  const parsed = questionSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  if (parsed.data.correct_index >= parsed.data.options.length) {
    return { error: 'Indice correcto invalido.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, module_id')
    .eq('id', parsed.data.quiz_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!quiz) {
    return { error: 'Quiz no encontrado.' };
  }

  const { data: lastQuestion } = await supabase
    .from('questions')
    .select('order_index')
    .eq('quiz_id', parsed.data.quiz_id)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastQuestion?.order_index ?? 0) + 1;

  const { error } = await supabase.from('questions').insert({
    org_id: profile.org_id,
    quiz_id: parsed.data.quiz_id,
    type: 'mcq',
    prompt: parsed.data.prompt,
    options_json: parsed.data.options,
    answer_json: { correctIndex: parsed.data.correct_index },
    order_index: nextOrder,
  });

  if (error) {
    return { error: error.message ?? 'No se pudo crear la pregunta.' };
  }

  revalidatePath(`/admin/courses/${quiz.module_id}/quiz`);
  return { error: null };
}
