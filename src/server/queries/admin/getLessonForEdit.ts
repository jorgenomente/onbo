'use server';

import { z } from 'zod';

import type { Profile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LessonForEdit = {
  id: string;
  unit_id: string | null;
  module_id: string;
  title: string;
  content_json: unknown | null;
};

const lessonIdSchema = z.string().uuid();

export async function getLessonForEdit(
  lessonId: string,
  profile: Profile | null,
): Promise<{ lesson: LessonForEdit | null; error: string | null }> {
  const parsedLessonId = lessonIdSchema.safeParse(lessonId);
  if (!parsedLessonId.success) {
    return { lesson: null, error: null };
  }

  if (!profile?.org_id) {
    return { lesson: null, error: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, unit_id, module_id, title, content_json')
    .eq('id', parsedLessonId.data)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  return { lesson: lesson ?? null, error: error?.message ?? null };
}
