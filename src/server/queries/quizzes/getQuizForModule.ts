'use server';

import { z } from 'zod';

import type { Profile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type QuizQuestion = {
  id: string;
  prompt: string;
  options_json: unknown;
  order_index: number | null;
  type: string;
};

type QuizAttempt = {
  score: number;
  passed: boolean;
  created_at: string;
};

type QuizForModuleData = {
  module: { id: string; title: string } | null;
  quiz: { id: string; title: string; passing_score: number } | null;
  questions: QuizQuestion[];
  lastAttempt: QuizAttempt | null;
  moduleError: string | null;
  quizError: string | null;
  questionsError: string | null;
};

const moduleIdSchema = z.string().uuid();

export async function getQuizForModule(
  moduleId: string,
  profile: Profile | null,
): Promise<QuizForModuleData> {
  const errorMessage = (error: unknown) => {
    if (!error) {
      return null;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' ? message : String(message);
    }
    return String(error);
  };
  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  if (!parsedModuleId.success || !profile?.org_id) {
    return {
      module: null,
      quiz: null,
      questions: [],
      lastAttempt: null,
      moduleError: null,
      quizError: null,
      questionsError: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id, title')
    .eq('id', parsedModuleId.data)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!module) {
    return {
      module: null,
      quiz: null,
      questions: [],
      lastAttempt: null,
      moduleError: errorMessage(moduleError),
      quizError: null,
      questionsError: null,
    };
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('module_id', module.id)
    .is('unit_id', null)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  const { data: questions, error: questionsError } = quiz
    ? await supabase
        .from('questions')
        .select('id, prompt, options_json, order_index, type')
        .eq('quiz_id', quiz.id)
        .eq('org_id', profile.org_id)
        .order('order_index', { ascending: true })
    : { data: [], error: null };

  const { data: attempt } = quiz
    ? await supabase
        .from('quiz_attempts')
        .select('score, passed, created_at')
        .eq('quiz_id', quiz.id)
        .eq('org_id', profile.org_id)
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return {
    module,
    quiz: quiz ?? null,
    questions: questions ?? [],
    lastAttempt: attempt ?? null,
    moduleError: errorMessage(moduleError),
    quizError: errorMessage(quizError),
    questionsError: errorMessage(questionsError),
  };
}
