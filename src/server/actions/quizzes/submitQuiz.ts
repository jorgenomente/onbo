'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SubmitQuizState = {
  error: string | null;
  score: number | null;
  passed: boolean | null;
};

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0),
});

const submitSchema = z.object({
  quiz_id: z.string().uuid(),
  answers: z.array(answerSchema).min(1),
});

const answerJsonSchema = z.object({
  correctIndex: z.number().int().min(0),
});

export async function submitQuiz(payload: {
  quiz_id: string;
  answers: { questionId: string; selectedIndex: number }[];
}): Promise<SubmitQuizState> {
  const parsed = submitSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: 'Datos invalidos.', score: null, passed: null };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  const allowed = profile.role === 'employee' || isAdminLike(profile.role);
  if (!allowed) {
    return { error: 'No autorizado.', score: null, passed: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, module_id, unit_id, passing_score')
    .eq('id', parsed.data.quiz_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!quiz) {
    return { error: 'Quiz no encontrado.', score: null, passed: null };
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('id, answer_json')
    .eq('quiz_id', parsed.data.quiz_id)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: true });

  const questionList = questions ?? [];
  if (questionList.length === 0) {
    return { error: 'El quiz no tiene preguntas.', score: null, passed: null };
  }

  const answersMap = new Map(
    parsed.data.answers.map((answer) => [answer.questionId, answer]),
  );

  if (answersMap.size !== questionList.length) {
    return { error: 'Responde todas las preguntas.', score: null, passed: null };
  }

  let correctCount = 0;

  for (const question of questionList) {
    const answer = answersMap.get(question.id);
    if (!answer) {
      return { error: 'Responde todas las preguntas.', score: null, passed: null };
    }
    const parsedAnswer = answerJsonSchema.safeParse(question.answer_json);
    if (!parsedAnswer.success) {
      return { error: 'Respuesta invalida en el quiz.', score: null, passed: null };
    }
    if (answer.selectedIndex === parsedAnswer.data.correctIndex) {
      correctCount += 1;
    }
  }

  const score = Math.round((correctCount / questionList.length) * 100);
  const passed = score >= quiz.passing_score;

  let moduleId = quiz.module_id ?? null;
  let unitId = quiz.unit_id ?? null;

  if (!moduleId && unitId) {
    const { data: unit } = await supabase
      .from('module_units')
      .select('module_id')
      .eq('id', unitId)
      .eq('org_id', profile.org_id)
      .maybeSingle();
    moduleId = unit?.module_id ?? null;
  }

  const { error } = await supabase.from('quiz_attempts').insert({
    org_id: profile.org_id,
    user_id: profile.user_id,
    quiz_id: quiz.id,
    score,
    passed,
    answers_json: parsed.data.answers,
  });

  if (error) {
    return { error: error.message ?? 'No se pudo guardar el intento.', score: null, passed: null };
  }

  if (moduleId) {
    revalidatePath(`/modules/${moduleId}/quiz`);
    revalidatePath(`/modules/${moduleId}`);
  }
  if (moduleId && unitId) {
    revalidatePath(`/modules/${moduleId}/units/${unitId}/quiz`);
  }
  return { error: null, score, passed };
}
