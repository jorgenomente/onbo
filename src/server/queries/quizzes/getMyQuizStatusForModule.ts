'use server';

import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LatestAttempt = {
  score: number;
  passed: boolean;
  created_at: string;
};

type FinalQuizStatus = {
  quizId: string;
  latestAttempt: LatestAttempt | null;
};

type UnitQuizStatus = {
  unitId: string;
  quizId: string;
  latestAttempt: LatestAttempt | null;
};

export type ModuleQuizStatus = {
  finalQuiz: FinalQuizStatus | null;
  unitQuizzes: UnitQuizStatus[];
};

const moduleIdSchema = z.string().uuid();

export async function getMyQuizStatusForModule(
  moduleId: string,
): Promise<ModuleQuizStatus> {
  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  if (!parsedModuleId.success) {
    return { finalQuiz: null, unitQuizzes: [] };
  }

  const profile = await getCurrentProfile();
  if (!profile?.org_id) {
    return { finalQuiz: null, unitQuizzes: [] };
  }

  const supabase = await createSupabaseServerClient();

  const { data: finalQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('module_id', parsedModuleId.data)
    .is('unit_id', null)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  const { data: units } = await supabase
    .from('module_units')
    .select('id')
    .eq('module_id', parsedModuleId.data)
    .eq('org_id', profile.org_id);

  const unitIds = units?.map((unit) => unit.id) ?? [];

  const { data: unitQuizzes } = unitIds.length
    ? await supabase
        .from('quizzes')
        .select('id, unit_id')
        .in('unit_id', unitIds)
        .is('module_id', null)
        .eq('org_id', profile.org_id)
    : { data: [] };

  const quizIds = [finalQuiz?.id, ...(unitQuizzes ?? []).map((q) => q.id)].filter(
    (id): id is string => Boolean(id),
  );

  const { data: attempts } = quizIds.length
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, passed, created_at')
        .eq('org_id', profile.org_id)
        .eq('user_id', profile.user_id)
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const latestByQuiz = new Map<string, LatestAttempt>();
  (attempts ?? []).forEach((attempt) => {
    if (!latestByQuiz.has(attempt.quiz_id)) {
      latestByQuiz.set(attempt.quiz_id, {
        score: attempt.score,
        passed: attempt.passed,
        created_at: attempt.created_at,
      });
    }
  });

  return {
    finalQuiz: finalQuiz
      ? {
          quizId: finalQuiz.id,
          latestAttempt: latestByQuiz.get(finalQuiz.id) ?? null,
        }
      : null,
    unitQuizzes: (unitQuizzes ?? []).map((quiz) => ({
      unitId: quiz.unit_id as string,
      quizId: quiz.id,
      latestAttempt: latestByQuiz.get(quiz.id) ?? null,
    })),
  };
}
