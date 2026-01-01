'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpdateQuestionState = { error: string | null };

const questionSchema = z.object({
  question_id: z.string().uuid(),
  prompt: z.string().trim().min(2),
  options: z.array(z.string().trim().min(1)).min(2),
  correct_index: z.number().int().min(0),
});

export async function updateQuestion(payload: {
  question_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
}): Promise<UpdateQuestionState> {
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
  const { data: question } = await supabase
    .from('questions')
    .select('id, quiz_id')
    .eq('id', parsed.data.question_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!question) {
    return { error: 'Pregunta no encontrada.' };
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

  const { error } = await supabase
    .from('questions')
    .update({
      prompt: parsed.data.prompt,
      options_json: parsed.data.options,
      answer_json: { correctIndex: parsed.data.correct_index },
    })
    .eq('id', parsed.data.question_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo actualizar la pregunta.' };
  }

  revalidatePath(`/admin/courses/${quiz.module_id}/quiz`);
  return { error: null };
}
