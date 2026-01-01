import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getUserEmailsByIds } from '@/server/superadmin/getUserEmailsByIds';
import { Button } from '@/components/ui/button';
import LocationForm from '../../location-form';
import GroupAdminForm from './group-admin-form';
import InviteAdminForm from './invite-admin-form';
import GroupAdminList from './group-admin-list';

const groupIdSchema = z.string().uuid();

export default async function SuperadminGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireSuperAdmin();

  const parsedGroupId = groupIdSchema.safeParse(groupId);
  if (!parsedGroupId.success) {
    notFound();
  }

  const supabase = createServiceRoleClient();
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, slug')
    .eq('id', parsedGroupId.data)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, slug, created_at')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false });

  const { data: adminMemberships } = await supabase
    .from('group_memberships')
    .select('user_id, created_at')
    .eq('group_id', group.id)
    .eq('role', 'group_admin');

  const adminIds = (adminMemberships ?? []).map((member) => member.user_id);
  const adminById = adminIds.length
    ? await getUserEmailsByIds(adminIds)
    : new Map<string, string | null>();

  const locationList = locations ?? [];
  const adminList = adminMemberships ?? [];
  const adminItems = adminList.map((admin) => ({
    userId: admin.user_id,
    groupId: group.id,
    email: adminById.get(admin.user_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{group.slug}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/onbo">Volver</Link>
        </Button>
      </header>

      <LocationForm groupId={group.id} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Administradores del grupo</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Agregar administrador existente
            </p>
            <GroupAdminForm groupId={group.id} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Invitar nuevo administrador (crea cuenta)
            </p>
            <InviteAdminForm groupId={group.id} />
          </div>
        </div>
        {adminList.length ? (
          <GroupAdminList admins={adminItems} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavia no hay administradores asignados.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Locales</h2>
        {locationList.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {locationList.map((location) => (
              <div key={location.id} className="rounded-lg border p-4 text-sm">
                <div className="font-semibold">{location.name}</div>
                <p className="text-xs text-muted-foreground">
                  {location.slug}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/${group.slug}/${location.slug}`}>
                    Abrir dashboard
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavia no hay locales creados.
          </p>
        )}
      </section>
    </div>
  );
}
