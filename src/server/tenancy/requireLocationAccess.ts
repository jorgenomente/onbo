'use server';

import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getLocationBySlugs } from './getLocationBySlugs';

export type LocationAccessResult = {
  group: {
    id: string;
    name: string;
    slug: string;
  };
  location: {
    id: string;
    group_id: string;
    name: string;
    slug: string;
  };
  roles: {
    groupRole: string | null;
    locationRole: string | null;
    isGroupAdmin: boolean;
  };
};

export async function requireLocationAccess(
  groupSlug: string,
  locationSlug: string,
) {
  const resolved = await getLocationBySlugs(groupSlug, locationSlug);
  if (!resolved) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: groupMembership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', resolved.group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: locationMembership, error: locationMembershipError } =
    await supabase
    .from('location_memberships')
    .select('role')
    .eq('location_id', resolved.location.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[tenancy] location access check', {
      groupSlug,
      locationSlug,
      groupId: resolved.group.id,
      locationId: resolved.location.id,
      userId: user.id,
      groupRole: groupMembership?.role ?? null,
      locationRole: locationMembership?.role ?? null,
      locationMembershipError: locationMembershipError?.message ?? null,
    });
  }

  if (!groupMembership && !locationMembership) {
    notFound();
  }

  const groupRole = groupMembership?.role ?? null;
  const locationRole = locationMembership?.role ?? null;
  const isGroupAdmin = groupRole === 'group_admin';

  return {
    group: resolved.group,
    location: resolved.location,
    roles: {
      groupRole,
      locationRole,
      isGroupAdmin,
    },
  } satisfies LocationAccessResult;
}
