import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getUserAuthInfoByIds } from '@/server/tenancy/getUserAuthInfoByIds';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { getUserEmailsByIds } from '@/server/tenancy/getUserEmailsByIds';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default async function LocationMembersPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
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

  const { data: stats, error: statsError } = await supabase.rpc(
    'get_location_member_course_stats',
    { p_location_id: location.id },
  );

  if (statsError && process.env.NODE_ENV !== 'production') {
    console.error('[members] stats rpc', {
      message: statsError.message,
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

  const { data: invites } = await adminClient
    .from('location_invites')
    .select('id, email, role, status, created_at, accepted_at')
    .eq('location_id', location.id)
    .order('created_at', { ascending: false });
  const inviteList = invites ?? [];

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

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="invites">Invitados</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
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
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                        {member.role}
                      </span>
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

        <TabsContent value="invites">
          <section className="space-y-3">
            {inviteList.length ? (
              <div className="space-y-2 text-sm">
                {inviteList.map((invite) => (
                  <div key={invite.id} className="rounded-lg border px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{invite.email}</p>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                        {invite.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · Creado: {formatDate(invite.created_at)} ·
                      Aceptado: {formatDate(invite.accepted_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay invitaciones para este local.
              </p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
