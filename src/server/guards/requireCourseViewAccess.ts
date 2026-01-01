'use server';

import { notFound } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const inputSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
});

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

type CourseRecord = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | string;
  location_id: string;
};

export async function requireCourseViewAccess(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
}) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  if (isSuperAdmin) {
    const adminClient = createServiceRoleClient();
    const { data: group } = await adminClient
      .from('groups')
      .select('id, slug, name')
      .eq('slug', parsed.data.groupSlug)
      .maybeSingle();

    if (!group) {
      notFound();
    }

    const { data: location } = await adminClient
      .from('locations')
      .select('id, group_id, slug, name')
      .eq('group_id', group.id)
      .eq('slug', parsed.data.locationSlug)
      .maybeSingle();

    if (!location) {
      notFound();
    }

    const { data: course } = await adminClient
      .from('modules')
      .select('id, title, description, status, location_id')
      .eq('id', parsed.data.courseId)
      .eq('location_id', location.id)
      .maybeSingle();

    if (!course) {
      notFound();
    }

    return {
      user,
      group,
      location,
      course: course as CourseRecord,
      role: 'superadmin',
      isAdminLike: true,
    };
  }

  const access = await requireLocationAccess(
    parsed.data.groupSlug,
    parsed.data.locationSlug,
  );
  const locationRole = access.roles.locationRole ?? null;
  const role = access.roles.isGroupAdmin ? 'group_admin' : locationRole;
  const isAdminLike =
    access.roles.isGroupAdmin ||
    locationRole === 'location_admin' ||
    locationRole === 'trainer';

  const { data: course } = await supabase
    .from('modules')
    .select('id, title, description, status, location_id')
    .eq('id', parsed.data.courseId)
    .eq('location_id', access.location.id)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  if (locationRole === 'employee' && course.status !== 'published') {
    notFound();
  }

  return {
    user,
    group: access.group,
    location: access.location,
    course: course as CourseRecord,
    role,
    isAdminLike,
  };
}
