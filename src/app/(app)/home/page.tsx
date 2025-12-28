import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile || !profile.org_id) redirect('/create-org');

  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from('modules')
    .select('id, title, status, order_index')
    .order('order_index', { ascending: true });

  const isEmployee = profile.role === 'employee';
  const { data: modules } = isAdminLike(profile.role)
    ? await query
    : await query.eq('status', 'published');

  const moduleIds = modules?.map((module) => module.id) ?? [];
  const { data: lessons } =
    isEmployee && moduleIds.length > 0
      ? await supabase
          .from('lessons')
          .select('id, module_id')
          .in('module_id', moduleIds)
      : { data: [] };

  const { data: progress } =
    isEmployee && moduleIds.length > 0
      ? await supabase
          .from('progress')
          .select('lesson_id, module_id')
          .eq('user_id', profile.user_id)
          .in('module_id', moduleIds)
      : { data: [] };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAdminLike(profile.role) ? 'Home' : 'Home (Employee)'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido/a, {user.email}
          </p>
        </div>
        {isAdminLike(profile.role) ? (
          <Button asChild variant="outline">
            <Link href="/modules">Gestionar módulos</Link>
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {modules?.length ? (
          modules.map((module) => {
            const total = totalByModule[module.id] ?? 0;
            const completed = completedByModule[module.id] ?? 0;

            return (
            <Link
              key={module.id}
              href={`/modules/${module.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition hover:bg-muted"
            >
              <span className="font-medium">{module.title}</span>
              <span className="text-xs text-muted-foreground">
                {isEmployee ? `${completed}/${total} completadas` : module.status}
              </span>
            </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay módulos disponibles todavía.
          </p>
        )}
      </div>
    </div>
  );
}
