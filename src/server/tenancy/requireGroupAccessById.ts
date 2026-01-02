'use server';

import { notFound, redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type GroupAccessByIdResult = {
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

export async function requireGroupAccessById(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminClient = createServiceRoleClient();
  const { data: group } = await adminClient
    .from('groups')
    .select('id, name, slug')
    .eq('id', groupId)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  if (isSuperAdmin) {
    return {
      group,
      role: 'superadmin',
      isGroupAdmin: false,
      isSuperAdmin: true,
    } satisfies GroupAccessByIdResult;
  }

  const { data: membership } = await adminClient
    .from('group_memberships')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    redirect('/no-access');
  }

  const role = membership.role ?? null;
  const isGroupAdmin = role === 'group_admin' || role === 'org_admin';

  if (!isGroupAdmin) {
    redirect('/no-access');
  }

  return {
    group,
    role,
    isGroupAdmin,
    isSuperAdmin: false,
  } satisfies GroupAccessByIdResult;
}
