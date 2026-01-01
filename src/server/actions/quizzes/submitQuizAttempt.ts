'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireCourseViewAccess } from '@/server/guards/requireCourseViewAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  quizId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.unknown()).default({}),
});

type AnswerPayload = Record<string, unknown>;

export async function submitQuizAttempt(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  quizId: string;
  answers: AnswerPayload;
}) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const ctx = await requireCourseViewAccess({
    groupSlug: parsed.data.groupSlug,
    locationSlug: parsed.data.locationSlug,
    courseId: parsed.data.courseId,
  });

  const adminClient = createServiceRoleClient();
  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, module_id, org_id, status, passing_score')
    .eq('id', parsed.data.quizId)
    .maybeSingle();

  if (!quiz || quiz.module_id !== ctx.course.id || !quiz.org_id) {
    throw new Error('Quiz no encontrado.');
  }

  if (quiz.status !== 'published') {
    throw new Error('Quiz no disponible.');
  }

  const { data: questions } = await adminClient
    .from('questions')
    .select('id, type, answer_json, content_json')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true });

  const questionList = questions ?? [];
  if (questionList.length === 0) {
    throw new Error('El quiz no tiene preguntas.');
  }

  let earnedPoints = 0;
  let totalPoints = 0;
  questionList.forEach((question) => {
    const points =
      question.content_json &&
      typeof question.content_json === 'object' &&
      'points' in question.content_json &&
      typeof (question.content_json as { points?: number }).points === 'number'
        ? (question.content_json as { points?: number }).points ?? 1
        : 1;
    totalPoints += points;
    const provided = parsed.data.answers[question.id] as
      | { type?: string; value?: unknown }
      | undefined;

    if (question.type === 'mcq') {
      const stored = question.answer_json as { correctIndex?: number } | null;
      const expected =
        typeof stored?.correctIndex === 'number' ? stored.correctIndex : null;
      const value =
        provided && typeof provided === 'object' && 'value' in provided
          ? (provided as { value?: unknown }).value
          : provided;
      if (expected !== null && value === expected) {
        earnedPoints += points;
      }
      return;
    }

    if (question.type === 'cloze_select') {
      const stored = question.answer_json as
        | { correct?: Record<string, string> }
        | null;
      const expected = stored?.correct ?? {};
      const value =
        provided &&
        typeof provided === 'object' &&
        'value' in provided
          ? (provided as { value?: unknown }).value
          : undefined;
      if (!value || typeof value !== 'object') {
        return;
      }
      const selections = value as Record<string, string>;
      const allMatch = Object.keys(expected).every(
        (key) => selections[key] === expected[key],
      );
      if (allMatch) {
        earnedPoints += points;
      }
      return;
    }

    if (question.type === 'order') {
      const stored = question.answer_json as
        | { correctOrder?: string[] }
        | null;
      const expected = stored?.correctOrder ?? [];
      const value =
        provided &&
        typeof provided === 'object' &&
        'value' in provided
          ? (provided as { value?: unknown }).value
          : undefined;
      if (!Array.isArray(value)) {
        return;
      }
      const order = value as string[];
      const matches =
        expected.length === order.length &&
        expected.every((item, index) => item === order[index]);
      if (matches) {
        earnedPoints += points;
      }
      return;
    }

    if (question.type === 'multi_select') {
      const stored = question.answer_json as
        | { correctIndices?: number[] }
        | null;
      const expected = stored?.correctIndices ?? [];
      const value =
        provided &&
        typeof provided === 'object' &&
        'value' in provided
          ? (provided as { value?: unknown }).value
          : undefined;
      if (!Array.isArray(value)) {
        return;
      }
      const selections = value as number[];
      const correctPicked = selections.filter((index) =>
        expected.includes(index),
      ).length;
      const wrongPicked = selections.filter(
        (index) => !expected.includes(index),
      ).length;
      const rawScore = correctPicked - wrongPicked;
      const clamped = Math.max(0, Math.min(points, rawScore));
      earnedPoints += clamped;
      return;
    }
  });

  const resolvedTotal = totalPoints > 0 ? totalPoints : 1;
  const score = Math.round((earnedPoints / resolvedTotal) * 100);
  const passed = score >= (quiz.passing_score ?? 70);

  const { error } = await adminClient.from('quiz_attempts').insert({
    org_id: quiz.org_id,
    user_id: user.id,
    quiz_id: quiz.id,
    score,
    passed,
    answers_json: {
      answers: parsed.data.answers,
      earnedPoints,
      totalPoints: resolvedTotal,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'No se pudo guardar el intento.');
  }

  const basePath = `/${ctx.group.slug}/${ctx.location.slug}/courses/${ctx.course.id}/view`;
  revalidatePath(basePath);
  revalidatePath(`${basePath}/quiz`);

  return { score, passed, earnedPoints, totalPoints: resolvedTotal };
}
