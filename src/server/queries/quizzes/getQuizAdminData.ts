'use server';

import { z } from 'zod';

import type { Profile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type QuizAdminQuestion = {
  id: string;
  prompt: string;
  options_json: unknown;
  answer_json: unknown;
  order_index: number | null;
  type: string;
};

type QuizAdminData = {
  module: { id: string; title: string } | null;
  quiz: { id: string; title: string; passing_score: number } | null;
  questions: QuizAdminQuestion[];
  moduleError: string | null;
  quizError: string | null;
  questionsError: string | null;
};

const moduleIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();

export async function getQuizAdminData(
  params: { moduleId?: string; unitId?: string },
  profile: Profile | null,
): Promise<QuizAdminData> {
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
  const parsedModuleId = params.moduleId
    ? moduleIdSchema.safeParse(params.moduleId)
    : null;
  const parsedUnitId = params.unitId ? unitIdSchema.safeParse(params.unitId) : null;
  const hasValidModule = parsedModuleId?.success ?? false;
  const hasValidUnit = parsedUnitId?.success ?? false;

  if (!profile?.org_id || (hasValidModule && hasValidUnit) || (!hasValidModule && !hasValidUnit)) {
    return {
      module: null,
      quiz: null,
      questions: [],
      moduleError: null,
      quizError: null,
      questionsError: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const moduleId = hasValidModule ? parsedModuleId?.data : null;
  const unitId = hasValidUnit ? parsedUnitId?.data : null;

  let module: { id: string; title: string } | null = null;
  let moduleError: string | null = null;

  if (moduleId) {
    const { data, error } = await supabase
      .from('modules')
      .select('id, title')
      .eq('id', moduleId)
      .eq('org_id', profile.org_id)
      .maybeSingle();
    module = data ?? null;
    moduleError = error?.message ?? null;
  } else if (unitId) {
    const { data: unit, error: unitError } = await supabase
      .from('module_units')
      .select('id, module_id, title')
      .eq('id', unitId)
      .eq('org_id', profile.org_id)
      .maybeSingle();
    if (unitError) {
      moduleError = unitError.message;
    } else if (unit) {
      const { data, error } = await supabase
        .from('modules')
        .select('id, title')
        .eq('id', unit.module_id)
        .eq('org_id', profile.org_id)
        .maybeSingle();
      module = data ?? null;
      moduleError = error?.message ?? null;
    }
  }

  if (!module) {
    return {
      module: null,
      quiz: null,
      questions: [],
      moduleError,
      quizError: null,
      questionsError: null,
    };
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('org_id', profile.org_id)
    .eq('module_id', moduleId ?? null)
    .eq('unit_id', unitId ?? null)
    .maybeSingle();

  const { data: questions, error: questionsError } = quiz
    ? await supabase
        .from('questions')
        .select('id, prompt, options_json, answer_json, order_index, type')
        .eq('quiz_id', quiz.id)
        .eq('org_id', profile.org_id)
        .order('order_index', { ascending: true })
    : { data: [], error: null };

  return {
    module,
    quiz: quiz ?? null,
    questions: questions ?? [],
    moduleError,
    quizError: errorMessage(quizError),
    questionsError: errorMessage(questionsError),
  };
}
