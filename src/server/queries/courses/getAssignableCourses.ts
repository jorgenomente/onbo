'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

type AssignableCourse = {
  id: string;
  org_id: string | null;
  title: string;
  status: string | null;
  created_at: string | null;
};

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAssignableCourses({
  viewerUserId,
}: {
  viewerUserId: string;
}): Promise<AssignableCourse[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== viewerUserId) {
    return [];
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  if (isSuperAdmin) {
    const adminClient = createServiceRoleClient();
    const { data } = await adminClient
      .from('courses')
      .select('id, org_id, title, status, created_at')
      .order('created_at', { ascending: false });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[assignableCourses]', {
        isSuperAdmin,
        viewerOrgId: null,
        count: data?.length ?? 0,
      });
    }

    return (data ?? []) as AssignableCourse[];
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', viewerUserId)
    .maybeSingle();

  const orgId = profile?.org_id ?? null;
  if (!orgId) {
    return [];
  }

  const { data } = await supabase
    .from('courses')
    .select('id, org_id, title, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[assignableCourses]', {
      isSuperAdmin,
      viewerOrgId: orgId,
      count: data?.length ?? 0,
    });
  }

  return (data ?? []) as AssignableCourse[];
}
