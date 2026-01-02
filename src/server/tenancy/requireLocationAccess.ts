'use server';

import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
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

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireLocationAccess(
  groupSlug: string,
  locationSlug: string,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  if (user.email && allowlist.includes(user.email.toLowerCase())) {
    const adminClient = createServiceRoleClient();
    const { data: group } = await adminClient
      .from('groups')
      .select('id, name, slug')
      .eq('slug', groupSlug)
      .maybeSingle();

    if (!group) {
      notFound();
    }

    const { data: location } = await adminClient
      .from('locations')
      .select('id, group_id, name, slug')
      .eq('slug', locationSlug)
      .eq('group_id', group.id)
      .maybeSingle();

    if (!location) {
      notFound();
    }

    return {
      group,
      location,
      roles: {
        groupRole: 'superadmin',
        locationRole: 'superadmin',
        isGroupAdmin: false,
      },
    } satisfies LocationAccessResult;
  }

  const resolved = await getLocationBySlugs(groupSlug, locationSlug);
  if (!resolved) {
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
