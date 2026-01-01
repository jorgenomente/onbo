import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile || !profile.org_id) redirect('/no-access');

  const supabase = await createSupabaseServerClient();
  const assignmentsQuery = supabase
    .from('assignments')
    .select('id, user_id, module_id, due_date, status, created_at')
    .order('created_at', { ascending: false });

  const { data: assignments } = isAdminLike(profile.role)
    ? await assignmentsQuery
    : await assignmentsQuery.eq('user_id', profile.user_id);

  const moduleIds = assignments?.map((assignment) => assignment.module_id) ?? [];
  const { data: modules } =
    moduleIds.length > 0
      ? await supabase
          .from('modules')
          .select('id, title, status')
          .in('id', moduleIds)
      : { data: [] };

  const { data: lessons } =
    moduleIds.length > 0
      ? await supabase
          .from('lessons')
          .select('id, module_id')
          .in('module_id', moduleIds)
      : { data: [] };

  const { data: progress } =
    moduleIds.length > 0
      ? await supabase
          .from('progress')
          .select('lesson_id, module_id')
          .eq('user_id', profile.user_id)
          .in('module_id', moduleIds)
      : { data: [] };

  const moduleMap = new Map(modules?.map((mod) => [mod.id, mod]));
  const totalByModule = (lessons ?? []).reduce<Record<string, number>>(
    (acc, lesson) => {
      acc[lesson.module_id] = (acc[lesson.module_id] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const completedByModule = (progress ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.module_id] = (acc[item.module_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Asignaciones</h1>
        <p className="text-sm text-muted-foreground">
          {isAdminLike(profile.role)
            ? 'Asignaciones activas en tu organización.'
            : 'Tus módulos asignados.'}
        </p>
      </div>

      <div className="space-y-2">
        {assignments?.length ? (
          assignments.map((assignment) => {
            const module = moduleMap.get(assignment.module_id);
            const total = totalByModule[assignment.module_id] ?? 0;
            const completed = completedByModule[assignment.module_id] ?? 0;
            const completedAll = total > 0 && completed === total;
            const dueDate = assignment.due_date
              ? new Date(assignment.due_date)
              : null;
            const overdue =
              dueDate && dueDate < today && !completedAll ? true : false;

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {module?.title ?? assignment.module_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {completed}/{total} completadas
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dueDate ? `Vence: ${assignment.due_date}` : 'Sin fecha'}
                    {overdue ? ' · Vencida' : ''}
                  </div>
                </div>
                {module?.status === 'published' ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/modules/${assignment.module_id}`}>
                      Ir al módulo
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Aún no disponible
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay asignaciones todavía.
          </p>
        )}
      </div>
    </div>
  );
}
