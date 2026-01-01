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

type QuizForUnitData = {
  module: { id: string; title: string } | null;
  unit: { id: string; title: string } | null;
  quiz: { id: string; title: string; passing_score: number } | null;
  questions: QuizQuestion[];
  lastAttempt: QuizAttempt | null;
  moduleError: string | null;
  quizError: string | null;
  questionsError: string | null;
};

const unitIdSchema = z.string().uuid();

export async function getQuizForUnit(
  unitId: string,
  profile: Profile | null,
): Promise<QuizForUnitData> {
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
  const parsedUnitId = unitIdSchema.safeParse(unitId);
  if (!parsedUnitId.success || !profile?.org_id) {
    return {
      module: null,
      unit: null,
      quiz: null,
      questions: [],
      lastAttempt: null,
      moduleError: null,
      quizError: null,
      questionsError: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: unit, error: unitError } = await supabase
    .from('module_units')
    .select('id, module_id, title')
    .eq('id', parsedUnitId.data)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!unit) {
    return {
      module: null,
      unit: null,
      quiz: null,
      questions: [],
      lastAttempt: null,
      moduleError: errorMessage(unitError),
      quizError: null,
      questionsError: null,
    };
  }

  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id, title')
    .eq('id', unit.module_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!module) {
    return {
      module: null,
      unit: { id: unit.id, title: unit.title },
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
    .eq('unit_id', unit.id)
    .is('module_id', null)
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
    unit: { id: unit.id, title: unit.title },
    quiz: quiz ?? null,
    questions: questions ?? [],
    lastAttempt: attempt ?? null,
    moduleError: errorMessage(moduleError),
    quizError: errorMessage(quizError),
    questionsError: errorMessage(questionsError),
  };
}
