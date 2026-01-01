import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateEnrollmentModuleDueDate } from '@/server/actions/enrollments/updateEnrollmentModuleDueDate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  const supabase = await createSupabaseServerClient();
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, start_date, interval_days, status')
    .eq('id', enrollmentId)
    .eq('org_id', profile.org_id)
    .single();

  if (!enrollment) {
    redirect('/settings/members');
  }

  const { data: enrollmentModules } = await supabase
    .from('enrollment_modules')
    .select('module_id, due_date, order_index')
    .eq('enrollment_id', enrollment.id)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: true });

  const moduleIds = enrollmentModules?.map((row) => row.module_id) ?? [];
  const { data: modules } =
    moduleIds.length > 0
      ? await supabase
          .from('modules')
          .select('id, title')
          .in('id', moduleIds)
      : { data: [] };

  const moduleMap = new Map(modules?.map((mod) => [mod.id, mod.title]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cronograma</h1>
        <p className="text-sm text-muted-foreground">
          Ajustá fechas de evaluación por módulo.
        </p>
      </div>

      <div className="space-y-2">
        {enrollmentModules?.length ? (
          enrollmentModules.map((item) => (
            <form
              key={item.module_id}
              action={updateEnrollmentModuleDueDate}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
            >
              <input type="hidden" name="enrollment_id" value={enrollment.id} />
              <input type="hidden" name="module_id" value={item.module_id} />
              <div className="flex-1 font-medium">
                {moduleMap.get(item.module_id) ?? item.module_id}
              </div>
              <Input name="due_date" type="date" defaultValue={item.due_date} />
              <Button type="submit" size="sm" variant="outline">
                Guardar
              </Button>
            </form>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay módulos en este enrollment.
          </p>
        )}
      </div>
    </div>
  );
}
