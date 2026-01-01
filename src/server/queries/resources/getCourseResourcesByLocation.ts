'use server';

import { z } from 'zod';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import type { ResourceItem } from '@/components/resources/ResourceCard';

const inputSchema = z.object({
  courseId: z.string().uuid(),
  locationId: z.string().uuid(),
  viewerRole: z.string().optional(),
});

export async function getCourseResourcesByLocation(input: {
  courseId: string;
  locationId: string;
  viewerRole?: string | null;
}) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return [] as ResourceItem[];
  }

  const adminClient = createServiceRoleClient();
  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id, org_id, status')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== parsed.data.locationId || !course.org_id) {
    return [] as ResourceItem[];
  }

  if (parsed.data.viewerRole === 'employee' && course.status !== 'published') {
    return [] as ResourceItem[];
  }

  const { data } = await adminClient
    .from('module_resources')
    .select('id, title, type, url, description')
    .eq('org_id', course.org_id)
    .eq('module_id', course.id)
    .order('created_at', { ascending: false });

  return (data ?? []) as ResourceItem[];
}
