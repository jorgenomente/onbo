'use server';

import { z } from 'zod';

import type { Profile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ModuleProgress = {
  doneLessonIds: Set<string>;
  doneCount: number;
  totalCount: number;
  percent: number;
};

const moduleIdSchema = z.string().uuid();

export async function getModuleProgress(
  moduleId: string,
  profile: Profile | null,
): Promise<ModuleProgress> {
  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  if (!parsedModuleId.success || !profile?.org_id) {
    return {
      doneLessonIds: new Set(),
      doneCount: 0,
      totalCount: 0,
      percent: 0,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: units } = await supabase
    .from('module_units')
    .select('id')
    .eq('module_id', parsedModuleId.data)
    .eq('org_id', profile.org_id);

  const unitIds = units?.map((unit) => unit.id) ?? [];
  if (unitIds.length === 0) {
    return {
      doneLessonIds: new Set(),
      doneCount: 0,
      totalCount: 0,
      percent: 0,
    };
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', parsedModuleId.data)
    .eq('org_id', profile.org_id)
    .in('unit_id', unitIds);

  const lessonIds = lessons?.map((lesson) => lesson.id) ?? [];
  if (lessonIds.length === 0) {
    return {
      doneLessonIds: new Set(),
      doneCount: 0,
      totalCount: 0,
      percent: 0,
    };
  }

  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id, status')
    .eq('org_id', profile.org_id)
    .eq('user_id', profile.user_id)
    .eq('module_id', parsedModuleId.data)
    .in('lesson_id', lessonIds)
    .eq('status', 'done');

  const doneLessonIds = new Set((progress ?? []).map((row) => row.lesson_id));
  const doneCount = doneLessonIds.size;
  const totalCount = lessonIds.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return { doneLessonIds, doneCount, totalCount, percent };
}
