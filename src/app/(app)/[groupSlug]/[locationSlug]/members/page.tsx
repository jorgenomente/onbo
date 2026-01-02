import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getUserAuthInfoByIds } from '@/server/tenancy/getUserAuthInfoByIds';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { getUserEmailsByIds } from '@/server/tenancy/getUserEmailsByIds';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InviteForm from '@/features/invites/components/InviteForm';
import LocationInvitesTable from '@/features/invites/components/LocationInvitesTable';
import { getLocationInvites } from '@/features/invites/queries';
import { mergeMemberLifecycle } from '@/features/members/mergeLifecycle';

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('es-ES');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function inviteBadge(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'accepted_member':
      return 'Aceptada · Activo';
    case 'accepted_not_member':
      return 'Aceptada · Sin activar';
    case 'pending_but_member':
      return 'Duplicado';
    case 'revoked':
      return 'Revocada';
    default:
      return 'Revisar';
  }
}

function activeBadge(status: string) {
  switch (status) {
    case 'active_ok':
      return 'Activo';
    case 'active_no_invite':
      return 'Activo · Sin invitacion';
    case 'active_invite_revoked':
      return 'Activo · Invitacion revocada';
    case 'active_invite_pending':
      return 'Activo · Invitacion pendiente';
    default:
      return 'Revisar';
  }
}

export default async function LocationMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawTab =
    typeof resolvedSearchParams?.tab === 'string'
      ? resolvedSearchParams.tab.toLowerCase()
      : '';
  const defaultTab =
    rawTab === 'invitaciones' || rawTab === 'activos' ? rawTab : 'activos';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());
  const adminClient = createServiceRoleClient();

  const access = isSuperAdmin
    ? null
    : await requireLocationAccess(groupSlug, locationSlug);

  const canView =
    isSuperAdmin ||
    !!access &&
      (access.roles.isGroupAdmin ||
        access.roles.locationRole === 'location_admin' ||
        access.roles.locationRole === 'trainer');

  if (!canView) {
    notFound();
  }

  const { data: group } = isSuperAdmin
    ? await adminClient
        .from('groups')
        .select('id, name, slug')
        .eq('slug', groupSlug)
        .maybeSingle()
    : { data: access?.group ?? null };

  if (!group) {
    notFound();
  }

  const { data: location } = isSuperAdmin
    ? await adminClient
        .from('locations')
        .select('id, group_id, name, slug')
        .eq('group_id', group.id)
        .eq('slug', locationSlug)
        .maybeSingle()
    : { data: access?.location ?? null };

  if (!location) {
    notFound();
  }

  const { data: memberships } = await adminClient
    .from('location_memberships')
    .select('user_id, role, created_at')
    .eq('location_id', location.id)
    .order('created_at', { ascending: false });

  const memberIds = (memberships ?? []).map((member) => member.user_id);
  const emailById = await getUserEmailsByIds(memberIds);
  let authUserMap = new Map<
    string,
    { email: string | null; last_sign_in_at: string | null }
  >();
  if (memberIds.length) {
    try {
      authUserMap = await getUserAuthInfoByIds(memberIds);
    } catch {
      authUserMap = new Map();
    }
  }

  const invites = await getLocationInvites(location.id);
  const emailByUserId = new Map<string, string | null>();
  memberIds.forEach((id) => {
    emailByUserId.set(id, authUserMap.get(id)?.email ?? null);
  });
  const { invitationRows, activeRows, warnings } = mergeMemberLifecycle({
    invites,
    memberships: memberships ?? [],
    emailByUserId,
  });
  const inviteStatusById = new Map(
    invitationRows.map((row) => [row.inviteId, inviteBadge(row.status)]),
  );
  const inviteNoteById = new Map(
    invitationRows
      .map((row) => {
        if (row.status === 'accepted_not_member') {
          return [
            row.inviteId,
            'Acepto la invitacion pero no aparece como miembro.',
          ] as const;
        }
        if (row.status === 'pending_but_member') {
          return [row.inviteId, 'Invitacion duplicada.'] as const;
        }
        return null;
      })
      .filter((row): row is readonly [string, string] => !!row),
  );
  const activeStatusByUserId = new Map(
    activeRows.map((row) => [row.userId, row.status]),
  );

  const { data: stats, error: statsError } = await supabase.rpc(
    'get_location_member_course_stats',
    { p_location_id: location.id },
  );

  const hasStatsError =
    !!statsError &&
    ((typeof statsError.message === 'string' &&
      statsError.message.trim().length > 0) ||
      (typeof statsError.details === 'string' &&
        statsError.details.trim().length > 0) ||
      Object.keys(statsError).length > 0);

  if (hasStatsError && process.env.NODE_ENV !== 'production') {
    console.warn('[members] stats rpc', {
      message: statsError.message ?? null,
      details: statsError.details ?? null,
    });
  }

  type MemberCourseStat = {
    user_id: string;
    course_id: string;
    lessons_total: number;
    lessons_completed: number;
    progress_pct: number | string | null;
    last_activity: string | null;
    final_quiz_status: string | null;
    final_quiz_best_score: number | string | null;
    final_quiz_passed: boolean | null;
    final_quiz_last_attempt: string | null;
  };

  const statsByUser = new Map<string, MemberCourseStat[]>();
  (stats as MemberCourseStat[] | null | undefined)?.forEach((row) => {
    const existing = statsByUser.get(row.user_id) ?? [];
    existing.push(row);
    statsByUser.set(row.user_id, existing);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Miembros</h1>
          <p className="text-sm text-muted-foreground">
            {group.name} · {location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${group.slug}/${location.slug}`}>
            Volver al local
          </Link>
        </Button>
      </header>

      {warnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            {warnings.length} alerta{warnings.length > 1 ? 's' : ''} detectada
            {warnings.length > 1 ? 's' : ''}
          </div>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {warnings.slice(0, 5).map((warning, index) => (
              <li key={`${warning.type}-${index}`}>
                {warning.email ?? warning.user_id ?? 'Usuario'} ·{' '}
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="activos">
          <section className="space-y-3">
            {memberIds.length ? (
              <div className="space-y-2 text-sm">
                {(memberships ?? []).map((member) => (
                  <div
                    key={member.user_id}
                    className="rounded-lg border px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/${group.slug}/${location.slug}/members/${member.user_id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {authUserMap.get(member.user_id)?.email ??
                          emailById.get(member.user_id) ??
                          member.user_id}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                          {member.role}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                          {activeBadge(
                            activeStatusByUserId.get(member.user_id) ??
                              'active_needs_review',
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ultimo login:{' '}
                      {authUserMap.get(member.user_id)?.last_sign_in_at
                        ? formatDateTime(
                            authUserMap.get(member.user_id)?.last_sign_in_at ??
                              null,
                          )
                        : 'Nunca'}{' '}
                      · Creado: {formatDate(member.created_at)}
                    </p>
                    {(() => {
                      if (member.role !== 'employee') {
                        return (
                          <div className="text-xs text-muted-foreground">
                            Progreso solo disponible para employees.
                          </div>
                        );
                      }
                      const userStats = statsByUser.get(member.user_id) ?? [];
                      if (!userStats.length) {
                        return (
                          <div className="text-xs text-muted-foreground">
                            Sin actividad
                          </div>
                        );
                      }

                      const sorted = [...userStats].sort((a, b) => {
                        const aTime =
                          a.last_activity ?? a.final_quiz_last_attempt ?? '';
                        const bTime =
                          b.last_activity ?? b.final_quiz_last_attempt ?? '';
                        return bTime.localeCompare(aTime);
                      });
                      const primary = sorted[0];
                      const extraCount = sorted.length - 1;
                      const progressPct = toNumber(primary.progress_pct);
                      const lessonsTotal = toNumber(primary.lessons_total);
                      const lessonsCompleted = toNumber(
                        primary.lessons_completed,
                      );
                      const bestScore = toNumber(primary.final_quiz_best_score);
                      const hasQuiz =
                        primary.final_quiz_status &&
                        primary.final_quiz_status !== 'not_started';

                      return (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>
                              Progreso:{' '}
                              {lessonsTotal > 0
                                ? `${progressPct}% (${lessonsCompleted}/${lessonsTotal})`
                                : 'Sin lecciones'}
                            </span>
                            <span>
                              Quiz:{' '}
                              {hasQuiz
                                ? `${bestScore}% ${
                                    primary.final_quiz_passed ? '✓' : '✗'
                                  }`
                                : 'Pendiente'}
                            </span>
                            {extraCount > 0 ? (
                              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                                +{extraCount}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            Ultima actividad:{' '}
                            {formatDateTime(
                              primary.last_activity ??
                                primary.final_quiz_last_attempt ??
                                null,
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavia no hay miembros asignados a este local.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="invitaciones">
          <section className="space-y-3">
            <InviteForm locationId={location.id} />
            <LocationInvitesTable
              groupSlug={group.slug}
              locationSlug={location.slug}
              locationId={location.id}
              canManage={canView}
              showPasswordLink
              lifecycleLabelByInviteId={inviteStatusById}
              lifecycleNoteByInviteId={inviteNoteById}
            />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
