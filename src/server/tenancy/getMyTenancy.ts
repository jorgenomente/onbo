'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

type GroupEntry = {
  id: string;
  slug: string;
  name: string;
};

type LocationEntry = {
  id: string;
  slug: string;
  groupSlug: string;
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

export async function getMyTenancy() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      isSuperAdmin: false,
      groups: [] as GroupEntry[],
      locations: [] as LocationEntry[],
    };
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin = allowlist.includes(user.email.toLowerCase());

  const { data: groupMemberships, error: groupsError } = await supabase
    .from('group_memberships')
    .select('group_id')
    .eq('user_id', user.id);

  let groupMembershipRows = groupMemberships ?? [];
  let groupsClient = supabase;

  if (groupsError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] group memberships error', groupsError?.message);
    }
    const adminClient = createServiceRoleClient();
    const { data: adminMemberships, error: adminError } = await adminClient
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id);

    if (adminError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[tenancy] group memberships fallback error', adminError?.message);
      }
      throw new Error('No se pudo cargar los grupos del usuario.');
    }

    groupMembershipRows = adminMemberships ?? [];
    groupsClient = adminClient;
  }

  const groupIds = groupMembershipRows.map((item) => item.group_id);
  const { data: groupsData, error: groupsDataError } = groupIds.length
    ? await groupsClient
        .from('groups')
        .select('id, slug, name')
        .in('id', groupIds)
    : { data: [] as GroupEntry[] };

  if (groupsDataError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] groups query error', groupsDataError?.message);
    }
    throw new Error('No se pudo cargar los grupos del usuario.');
  }

  const groups = (groupsData ?? []) as GroupEntry[];

  const { data: locationMemberships, error: locationsError } = await supabase
    .from('location_memberships')
    .select('location_id')
    .eq('user_id', user.id);

  let locationMembershipRows = locationMemberships ?? [];
  let locationsClient = supabase;

  if (locationsError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] location memberships error', locationsError?.message);
    }
    const adminClient = createServiceRoleClient();
    const { data: adminLocationMemberships, error: adminError } =
      await adminClient
        .from('location_memberships')
        .select('location_id')
        .eq('user_id', user.id);

    if (adminError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[tenancy] location memberships fallback error', adminError?.message);
      }
      throw new Error('No se pudo cargar los locales del usuario.');
    }

    locationMembershipRows = adminLocationMemberships ?? [];
    locationsClient = adminClient;
  }

  const locationIds = locationMembershipRows.map((item) => item.location_id);
  const { data: locationsData, error: locationsDataError } = locationIds.length
    ? await locationsClient
        .from('locations')
        .select('id, slug, group_id')
        .in('id', locationIds)
    : { data: [] as { id: string; slug: string; group_id: string }[] };

  if (locationsDataError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] locations query error', locationsDataError?.message);
    }
    throw new Error('No se pudo cargar los locales del usuario.');
  }

  const locationGroupIds = (locationsData ?? []).map((loc) => loc.group_id);
  const { data: locationGroupsData, error: locationGroupsError } =
    locationGroupIds.length
      ? await locationsClient
          .from('groups')
          .select('id, slug')
          .in('id', locationGroupIds)
      : { data: [] as { id: string; slug: string }[] };

  let resolvedLocationGroups = locationGroupsData ?? [];

  if (locationGroupsError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[tenancy] location groups query error',
        locationGroupsError?.message,
      );
    }
    const adminClient = createServiceRoleClient();
    const { data: adminLocationGroups, error: adminError } =
      await adminClient
        .from('groups')
        .select('id, slug')
        .in('id', locationGroupIds);

    if (adminError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[tenancy] location groups fallback error',
          adminError?.message,
        );
      }
      throw new Error('No se pudo cargar los locales del usuario.');
    }

    resolvedLocationGroups = adminLocationGroups ?? [];
  }

  const groupSlugById = new Map(
    resolvedLocationGroups.map((group) => [group.id, group.slug]),
  );

  const missingGroupIds = locationGroupIds.filter(
    (groupId) => !groupSlugById.has(groupId),
  );

  if (missingGroupIds.length) {
    const adminClient = createServiceRoleClient();
    const { data: adminLocationGroups, error: adminError } = await adminClient
      .from('groups')
      .select('id, slug')
      .in('id', missingGroupIds);

    if (adminError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[tenancy] location groups fill error',
          adminError?.message,
        );
      }
      throw new Error('No se pudo cargar los locales del usuario.');
    }

    (adminLocationGroups ?? []).forEach((group) => {
      groupSlugById.set(group.id, group.slug);
    });
  }

  const locations =
    (locationsData ?? [])
      .map((location) => ({
        id: location.id,
        slug: location.slug,
        groupSlug: groupSlugById.get(location.group_id) ?? '',
      }))
      .filter((location) => Boolean(location.groupSlug)) ?? [];

  return { isSuperAdmin, groups, locations };
}
