import { redirect } from 'next/navigation';

export default async function GroupDashboardAliasPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  redirect(`/${groupSlug}`);
}
