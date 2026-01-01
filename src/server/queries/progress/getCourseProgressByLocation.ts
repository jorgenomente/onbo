'use server';

import { z } from 'zod';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const inputSchema = z.object({
  courseId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
});

type ProgressSnapshot = {
  completedLessonIds: string[];
  completedCount: number;
  totalLessons: number;
  percent: number;
};

export async function getCourseProgressByLocation(input: {
  courseId: string;
  locationId: string;
  userId: string;
}): Promise<ProgressSnapshot> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      completedLessonIds: [],
      completedCount: 0,
      totalLessons: 0,
      percent: 0,
    };
  }

  const adminClient = createServiceRoleClient();
  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id, org_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== parsed.data.locationId) {
    return {
      completedLessonIds: [],
      completedCount: 0,
      totalLessons: 0,
      percent: 0,
    };
  }

  const { data: lessons } = await adminClient
    .from('lessons')
    .select('id')
    .eq('module_id', parsed.data.courseId);

  const lessonIds = lessons?.map((lesson) => lesson.id) ?? [];
  const totalLessons = lessonIds.length;
  if (!totalLessons || !course.org_id) {
    return {
      completedLessonIds: [],
      completedCount: 0,
      totalLessons,
      percent: 0,
    };
  }

  const { data: progress } = await adminClient
    .from('progress')
    .select('lesson_id')
    .eq('org_id', course.org_id)
    .eq('user_id', parsed.data.userId)
    .eq('module_id', parsed.data.courseId)
    .eq('status', 'done')
    .in('lesson_id', lessonIds);

  const completedLessonIds = (progress ?? []).map((row) => row.lesson_id);
  const completedCount = completedLessonIds.length;
  const percent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return {
    completedLessonIds,
    completedCount,
    totalLessons,
    percent,
  };
}
