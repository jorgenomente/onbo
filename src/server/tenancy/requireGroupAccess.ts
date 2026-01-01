'use server';

import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getGroupBySlug } from './getGroupBySlug';

export type GroupAccessResult = {
  group: {
    id: string;
    name: string;
    slug: string;
  };
  role: string | null;
  isGroupAdmin: boolean;
  isSuperAdmin: boolean;
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

export async function requireGroupAccess(groupSlug: string) {
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

    return {
      group,
      role: 'superadmin',
      isGroupAdmin: false,
      isSuperAdmin: true,
    } satisfies GroupAccessResult;
  }

  const group = await getGroupBySlug(groupSlug);
  if (!group) {
    notFound();
  }

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const role = membership.role ?? null;
  const isGroupAdmin = role === 'group_admin';

  return {
    group,
    role,
    isGroupAdmin,
    isSuperAdmin: false,
  } satisfies GroupAccessResult;
}
