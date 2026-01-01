'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGroupBySlug, type GroupRecord } from './getGroupBySlug';

export type LocationRecord = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
};

const slugSchema = z.string().trim().min(1);

export async function getLocationBySlugs(
  groupSlug: string,
  locationSlug: string,
) {
  const parsedGroup = slugSchema.safeParse(groupSlug);
  const parsedLocation = slugSchema.safeParse(locationSlug);
  if (!parsedGroup.success || !parsedLocation.success) {
    return null;
  }

  const group = await getGroupBySlug(parsedGroup.data);
  if (!group) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] group by slug not found', {
        groupSlug: parsedGroup.data,
      });
    }
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('locations')
    .select('id, group_id, name, slug')
    .eq('group_id', group.id)
    .eq('slug', parsedLocation.data)
    .maybeSingle();

  if (!data || error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] location by slugs error', {
        groupSlug: parsedGroup.data,
        locationSlug: parsedLocation.data,
        error: error?.message ?? null,
        hasData: Boolean(data),
      });
    }
    return null;
  }

  return {
    group,
    location: data as LocationRecord,
  } satisfies { group: GroupRecord; location: LocationRecord };
}
