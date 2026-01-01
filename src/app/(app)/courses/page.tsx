import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';

export default async function CoursesEntryPage() {
  const profile = await getCurrentProfile();

  if (profile && isAdminLike(profile.role)) {
    redirect('/admin/courses');
  }

  redirect('/home');
}
