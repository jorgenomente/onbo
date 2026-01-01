import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { getUserEmailsByIds } from '@/server/tenancy/getUserEmailsByIds';
import { Button } from '@/components/ui/button';
import AssignmentForm from './assignment-form';

export default async function LocationAssignmentsPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string }>;
}) {
  const { groupSlug, locationSlug } = await params;
  const access = await requireLocationAccess(groupSlug, locationSlug);

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from('location_memberships')
    .select('user_id, role')
    .eq('location_id', access.location.id)
    .order('created_at', { ascending: false });

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title')
    .eq('location_id', access.location.id)
    .order('created_at', { ascending: false });

  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('id, module_id, user_id, due_date, status, created_at')
    .eq('location_id', access.location.id)
    .order('created_at', { ascending: false });

  const memberIds = (members ?? []).map((member) => member.user_id);
  const emailById = await getUserEmailsByIds(memberIds);

  const memberOptions =
    (members ?? []).map((member) => ({
      userId: member.user_id,
      label: emailById.get(member.user_id) ?? member.user_id,
    })) ?? [];

  const moduleOptions = (modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
  }));

  const moduleMap = new Map(moduleOptions.map((module) => [module.id, module.title]));

  const basePath = `/${access.group.slug}/${access.location.slug}/assignments`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Asignaciones</h1>
          <p className="text-sm text-muted-foreground">
            {access.group.name} · {access.location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${access.group.slug}/${access.location.slug}`}>
            Volver al local
          </Link>
        </Button>
      </header>

      {memberOptions.length && moduleOptions.length ? (
        <AssignmentForm
          locationId={access.location.id}
          revalidatePathname={basePath}
          members={memberOptions}
          modules={moduleOptions}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Necesitas al menos un miembro y un curso para asignar.
        </p>
      )}

      <section className="space-y-3">
        {assignments?.length ? (
          <div className="space-y-2 text-sm">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-lg border px-3 py-2">
                <p className="font-medium">
                  {moduleMap.get(assignment.module_id) ?? assignment.module_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {emailById.get(assignment.user_id) ?? assignment.user_id} ·{' '}
                  {assignment.status}
                  {assignment.due_date ? ` · vence ${assignment.due_date}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay asignaciones todavía.
          </p>
        )}
      </section>
    </div>
  );
}
