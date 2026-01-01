'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteQuestionState = { error: string | null };

const deleteSchema = z.object({
  question_id: z.string().uuid(),
});

export async function deleteQuestion(payload: {
  question_id: string;
}): Promise<DeleteQuestionState> {
  const parsed = deleteSchema.safeParse(payload);
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
    .delete()
    .eq('id', parsed.data.question_id)
    .eq('org_id', profile.org_id);

  if (error) {
    return { error: error.message ?? 'No se pudo borrar la pregunta.' };
  }

  revalidatePath(`/admin/courses/${quiz.module_id}/quiz`);
  return { error: null };
}
