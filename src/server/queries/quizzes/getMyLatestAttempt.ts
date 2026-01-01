'use server';

import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type QuizAttempt = {
  id: string;
  score: number;
  passed: boolean;
  created_at: string;
};

const quizIdSchema = z.string().uuid();

export async function getMyLatestAttempt(quizId: string) {
  const parsedQuizId = quizIdSchema.safeParse(quizId);
  if (!parsedQuizId.success) {
    return null;
  }

  const profile = await getCurrentProfile();
  if (!profile?.org_id) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('quiz_attempts')
    .select('id, score, passed, created_at')
    .eq('quiz_id', parsedQuizId.data)
    .eq('user_id', profile.user_id)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as QuizAttempt | null;
}
