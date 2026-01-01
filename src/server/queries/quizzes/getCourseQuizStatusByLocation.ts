'use server';

import { z } from 'zod';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const inputSchema = z.object({
  courseId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
});

type QuizStatus = {
  quiz: { id: string; title: string; status: string } | null;
  latestAttempt: { score: number; passed: boolean } | null;
};

export async function getCourseQuizStatusByLocation(input: {
  courseId: string;
  locationId: string;
  userId: string;
}): Promise<QuizStatus> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { quiz: null, latestAttempt: null };
  }

  const adminClient = createServiceRoleClient();
  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== parsed.data.locationId) {
    return { quiz: null, latestAttempt: null };
  }

  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, title, status')
    .eq('module_id', course.id)
    .maybeSingle();

  if (!quiz) {
    return { quiz: null, latestAttempt: null };
  }

  const { data: attempts } = await adminClient
    .from('quiz_attempts')
    .select('score, passed, created_at')
    .eq('quiz_id', quiz.id)
    .eq('user_id', parsed.data.userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const latestAttempt = attempts?.[0] ?? null;

  return {
    quiz,
    latestAttempt: latestAttempt
      ? { score: latestAttempt.score, passed: latestAttempt.passed }
      : null,
  };
}
