'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const deleteLessonSchema = z.object({
  lesson_id: z.string().uuid(),
});

export async function deleteLesson(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const payload = {
    lesson_id: formData.get('lesson_id'),
  };

  const parsed = deleteLessonSchema.safeParse({
    lesson_id: typeof payload.lesson_id === 'string' ? payload.lesson_id : '',
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('lessons')
    .delete()
    .eq('id', parsed.data.lesson_id)
    .eq('org_id', profile.org_id);
}
