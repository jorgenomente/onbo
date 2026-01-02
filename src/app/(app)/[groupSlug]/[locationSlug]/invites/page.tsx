import { redirect } from 'next/navigation';

export default async function LocationInvitesPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  redirect(`/${groupSlug}/${locationSlug}/members?tab=invitaciones`);
}
