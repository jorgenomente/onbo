'use server';

import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type CourseProgressState = 'not_started' | 'in_progress' | 'completed';

type MemberCourseStatus = {
  moduleId: string;
  moduleTitle: string;
  moduleStatus: string;
  dueDate: string | null;
  progress: {
    doneCount: number;
    totalCount: number;
    percent: number;
    state: CourseProgressState;
  };
  finalQuiz: {
    quizId: string;
    latestAttempt: {
      score: number;
      passed: boolean;
      created_at: string;
    } | null;
  } | null;
};

const memberSchema = z.string().uuid();

export async function getMemberCoursesStatus(memberUserId: string) {
  const parsedMemberId = memberSchema.safeParse(memberUserId);
  if (!parsedMemberId.success) {
    return [] as MemberCourseStatus[];
  }

  const profile = await getCurrentProfile();
  if (!profile?.org_id || !isAdminLike(profile.role)) {
    return [] as MemberCourseStatus[];
  }

  const supabase = await createSupabaseServerClient();
  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('module_id, due_date, modules(id, title, status)')
    .eq('org_id', profile.org_id)
    .eq('user_id', parsedMemberId.data)
    .order('created_at', { ascending: false });

  if (process.env.NODE_ENV !== 'production' && assignmentsError) {
    console.error('[member-courses] assignments error', {
      memberUserId: parsedMemberId.data,
      message: assignmentsError.message,
      details: assignmentsError.details ?? null,
    });
  }

  const assignmentList = assignments ?? [];
  if (process.env.NODE_ENV !== 'production') {
    console.log('[member-courses] assignments', {
      memberUserId: parsedMemberId.data,
      count: assignmentList.length,
      modules: assignmentList.map((item) => item.module_id),
    });
  }
  const moduleIds = assignmentList.map((assignment) => assignment.module_id);

  if (moduleIds.length === 0) {
    return [] as MemberCourseStatus[];
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, module_id')
    .eq('org_id', profile.org_id)
    .in('module_id', moduleIds);

  if (process.env.NODE_ENV !== 'production' && lessonsError) {
    console.error('[member-courses] lessons error', {
      memberUserId: parsedMemberId.data,
      message: lessonsError.message,
      details: lessonsError.details ?? null,
    });
  }

  const { data: progress, error: progressError } = await supabase
    .from('progress')
    .select('module_id, status')
    .eq('org_id', profile.org_id)
    .eq('user_id', parsedMemberId.data)
    .in('module_id', moduleIds);

  if (process.env.NODE_ENV !== 'production' && progressError) {
    console.error('[member-courses] progress error', {
      memberUserId: parsedMemberId.data,
      message: progressError.message,
      details: progressError.details ?? null,
    });
  }

  const { data: quizzes, error: quizzesError } = await supabase
    .from('quizzes')
    .select('id, module_id')
    .eq('org_id', profile.org_id)
    .in('module_id', moduleIds)
    .is('unit_id', null);

  if (process.env.NODE_ENV !== 'production' && quizzesError) {
    console.error('[member-courses] quizzes error', {
      memberUserId: parsedMemberId.data,
      message: quizzesError.message,
      details: quizzesError.details ?? null,
    });
  }

  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);

  const { data: attempts, error: attemptsError } = quizIds.length
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, passed, created_at')
        .eq('org_id', profile.org_id)
        .eq('user_id', parsedMemberId.data)
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  if (process.env.NODE_ENV !== 'production' && attemptsError) {
    console.error('[member-courses] attempts error', {
      memberUserId: parsedMemberId.data,
      message: attemptsError.message,
      details: attemptsError.details ?? null,
    });
  }

  const moduleMap = new Map(
    assignmentList
      .map((assignment) => assignment.modules)
      .filter((module) => Boolean(module) && !Array.isArray(module))
      .map((module) => module as { id: string; title: string; status: string })
      .map((module) => [module.id, module]),
  );
  const lessonCountByModule = (lessons ?? []).reduce<Record<string, number>>(
    (acc, lesson) => {
      acc[lesson.module_id] = (acc[lesson.module_id] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const doneCountByModule = (progress ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      if (row.status === 'done' || row.status === 'completed') {
        acc[row.module_id] = (acc[row.module_id] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );
  const quizByModule = new Map(
    (quizzes ?? []).map((quiz) => [quiz.module_id, quiz.id]),
  );
  const latestAttemptByQuiz = (attempts ?? []).reduce<
    Record<string, { score: number; passed: boolean; created_at: string }>
  >((acc, attempt) => {
    if (!acc[attempt.quiz_id]) {
      acc[attempt.quiz_id] = {
        score: attempt.score,
        passed: attempt.passed,
        created_at: attempt.created_at,
      };
    }
    return acc;
  }, {});

  return assignmentList.map((assignment) => {
    const module = moduleMap.get(assignment.module_id);
    const totalCount = lessonCountByModule[assignment.module_id] ?? 0;
    const doneCount = doneCountByModule[assignment.module_id] ?? 0;
    const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const state: CourseProgressState =
      percent === 0 ? 'not_started' : percent >= 100 ? 'completed' : 'in_progress';

    const quizId = quizByModule.get(assignment.module_id) ?? null;
    const latestAttempt = quizId ? latestAttemptByQuiz[quizId] ?? null : null;

    return {
      moduleId: assignment.module_id,
      moduleTitle: module?.title ?? assignment.module_id,
      moduleStatus: module?.status ?? 'unknown',
      dueDate: assignment.due_date ?? null,
      progress: { doneCount, totalCount, percent, state },
      finalQuiz: quizId
        ? {
            quizId,
            latestAttempt: latestAttempt ?? null,
          }
        : null,
    };
  });
}
