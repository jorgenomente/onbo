import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { getUserAuthInfoByIds } from '@/server/tenancy/getUserAuthInfoByIds';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import RemoveMemberDialog from './RemoveMemberDialog';

const userIdSchema = z.string().uuid();

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

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; userId: string }>;
}) {
  const { groupSlug, locationSlug, userId } = await params;
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    notFound();
  }

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

  const { data: membership } = await adminClient
    .from('location_memberships')
    .select('user_id, role, created_at')
    .eq('location_id', location.id)
    .eq('user_id', parsedUserId.data)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const authInfo = await getUserAuthInfoByIds([parsedUserId.data]);
  const authUser = authInfo.get(parsedUserId.data) ?? null;

  const { data: stats } = await supabase.rpc(
    'get_location_member_course_stats',
    { p_location_id: location.id },
  );
  const myStats = (stats as MemberCourseStat[] | null | undefined)?.filter(
    (row) => row.user_id === parsedUserId.data,
  ) ?? [];

  const { data: modules } = await adminClient
    .from('modules')
    .select('id, title')
    .eq('location_id', location.id);
  const moduleMap = new Map(
    (modules ?? []).map((module) => [module.id, module.title]),
  );
  const moduleIds = (modules ?? []).map((module) => module.id);

  const { data: progressRows } =
    moduleIds.length > 0
      ? await adminClient
          .from('progress')
          .select('module_id, lesson_id, status, updated_at')
          .eq('user_id', parsedUserId.data)
          .in('module_id', moduleIds)
          .order('updated_at', { ascending: false })
          .limit(20)
      : { data: [] as Array<{
          module_id: string;
          lesson_id: string;
          status: string;
          updated_at: string;
        }> };

  const lessonIds = (progressRows ?? []).map((row) => row.lesson_id);
  const { data: lessons } =
    lessonIds.length > 0
      ? await adminClient
          .from('lessons')
          .select('id, title, module_id')
          .in('id', lessonIds)
      : { data: [] as Array<{ id: string; title: string; module_id: string }> };
  const lessonMap = new Map(
    (lessons ?? []).map((lesson) => [lesson.id, lesson.title]),
  );

  const { data: quizzes } =
    moduleIds.length > 0
      ? await adminClient
          .from('quizzes')
          .select('id, title, module_id')
          .in('module_id', moduleIds)
      : { data: [] as Array<{ id: string; title: string; module_id: string }> };
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  const quizMap = new Map(
    (quizzes ?? []).map((quiz) => [quiz.id, quiz]),
  );

  const { data: attempts } =
    quizIds.length > 0
      ? await adminClient
          .from('quiz_attempts')
          .select('quiz_id, score, passed, created_at')
          .eq('user_id', parsedUserId.data)
          .in('quiz_id', quizIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] as Array<{ quiz_id: string; score: number; passed: boolean; created_at: string }> };

  async function removeMember(formData: FormData) {
    'use server';
    const formUserId = formData.get('user_id');
    if (typeof formUserId !== 'string' || !userIdSchema.safeParse(formUserId).success) {
      throw new Error('Usuario invalido.');
    }

    const supabaseAction = await createSupabaseServerClient();
    const {
      data: { user: actionUser },
    } = await supabaseAction.auth.getUser();
    if (!actionUser) {
      notFound();
    }

    const allowlistAction = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
    const isSuperAdminAction =
      !!actionUser.email &&
      allowlistAction.includes(actionUser.email.toLowerCase());

    const accessAction = isSuperAdminAction
      ? null
      : await requireLocationAccess(groupSlug, locationSlug);
    const canManageAction =
      isSuperAdminAction ||
      !!accessAction &&
        (accessAction.roles.isGroupAdmin ||
          accessAction.roles.locationRole === 'location_admin' ||
          accessAction.roles.locationRole === 'trainer');

    if (!canManageAction) {
      notFound();
    }

    const adminActionClient = createServiceRoleClient();
    const { data: groupAction } = isSuperAdminAction
      ? await adminActionClient
          .from('groups')
          .select('id')
          .eq('slug', groupSlug)
          .maybeSingle()
      : { data: accessAction?.group ?? null };
    if (!groupAction) {
      notFound();
    }

    const { data: locationAction } = isSuperAdminAction
      ? await adminActionClient
          .from('locations')
          .select('id, group_id')
          .eq('group_id', groupAction.id)
          .eq('slug', locationSlug)
          .maybeSingle()
      : { data: accessAction?.location ?? null };
    if (!locationAction) {
      notFound();
    }

    await adminActionClient
      .from('location_memberships')
      .delete()
      .eq('location_id', locationAction.id)
      .eq('user_id', formUserId);

    redirect(`/${groupSlug}/${locationSlug}/members`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {group.name} · {location.name}
          </div>
          <h1 className="text-2xl font-semibold">
            {authUser?.email ?? membership.user_id}
          </h1>
          <p className="text-sm text-muted-foreground">
            Rol: {membership.role} · Estado: Activo
          </p>
          <p className="text-xs text-muted-foreground">
            Ultimo login:{' '}
            {authUser?.last_sign_in_at
              ? formatDateTime(authUser.last_sign_in_at)
              : 'Nunca'}{' '}
            · Miembro desde: {formatDate(membership.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/${group.slug}/${location.slug}/members`}>
              Volver a miembros
            </Link>
          </Button>
          <RemoveMemberDialog userId={membership.user_id} action={removeMember} />
        </div>
      </header>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Cursos y progreso</h2>
        {myStats.length ? (
          <div className="space-y-2 text-sm">
            {myStats.map((row) => {
              const lessonsTotal = toNumber(row.lessons_total);
              const lessonsCompleted = toNumber(row.lessons_completed);
              const progressPct = toNumber(row.progress_pct);
              const quizScore = toNumber(row.final_quiz_best_score);
              return (
                <div key={row.course_id} className="rounded-md border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {moduleMap.get(row.course_id) ?? row.course_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ultima actividad:{' '}
                      {formatDateTime(
                        row.last_activity ?? row.final_quiz_last_attempt ?? null,
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Progreso:{' '}
                    {lessonsTotal > 0
                      ? `${progressPct}% (${lessonsCompleted}/${lessonsTotal})`
                      : 'Sin lecciones'}{' '}
                    · Quiz final:{' '}
                    {row.final_quiz_status === 'completed'
                      ? `${quizScore}% ${row.final_quiz_passed ? '✓' : '✗'}`
                      : 'Pendiente'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin actividad aun.</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Timeline de actividad</h2>
        {progressRows && progressRows.length ? (
          <div className="space-y-2 text-sm">
            {progressRows.map((row) => (
              <div key={`${row.lesson_id}-${row.updated_at}`} className="rounded-md border px-3 py-2">
                <div className="font-medium">
                  {lessonMap.get(row.lesson_id) ?? row.lesson_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  {moduleMap.get(row.module_id) ?? row.module_id} ·{' '}
                  {row.status} · {formatDateTime(row.updated_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin actividad aun.</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Intentos de quiz final</h2>
        {attempts && attempts.length ? (
          <div className="space-y-2 text-sm">
            {attempts.map((attempt) => {
              const quiz = quizMap.get(attempt.quiz_id);
              const courseTitle = quiz?.module_id
                ? moduleMap.get(quiz.module_id)
                : null;
              return (
                <div key={`${attempt.quiz_id}-${attempt.created_at}`} className="rounded-md border px-3 py-2">
                  <div className="font-medium">
                    {courseTitle ?? quiz?.title ?? attempt.quiz_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(attempt.created_at)} · Score: {attempt.score}% ·{' '}
                    {attempt.passed ? 'Aprobado' : 'Reprobado'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin intentos.</p>
        )}
      </section>
    </div>
  );
}
