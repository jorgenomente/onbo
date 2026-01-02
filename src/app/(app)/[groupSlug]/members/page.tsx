import { redirect } from 'next/navigation';

import { requireGroupAccess } from '@/server/tenancy/requireGroupAccess';

export default async function GroupMembersAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupSlug } = await params;
  const sp = searchParams ? await searchParams : {};

  const access = await requireGroupAccess(groupSlug);
  const isAdminLike = access.isSuperAdmin || access.isGroupAdmin;

  if (!isAdminLike) {
    redirect('/no-access');
  }

  const rawTab = typeof sp.tab === 'string' ? sp.tab : 'members';
  const nextTab = rawTab.trim().length ? rawTab : 'members';

  redirect(`/onbo/groups/${access.group.id}?tab=${encodeURIComponent(nextTab)}`);
}
