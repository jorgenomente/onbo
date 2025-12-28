import Link from 'next/link';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function ModulesPage() {
  const profile = await getCurrentProfile();

  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from('modules')
    .select('id, title, status, order_index')
    .order('order_index', { ascending: true });

  const { data: modules } =
    profile && isAdminLike(profile.role)
      ? await query
      : await query.eq('status', 'published');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Módulos</h1>
        {profile && isAdminLike(profile.role) ? (
          <Button asChild>
            <Link href="/modules/new">Nuevo módulo</Link>
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {modules?.length ? (
          modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
            >
              <div className="space-y-1">
                <Link
                  href={`/modules/${module.id}`}
                  className="font-medium transition hover:text-foreground"
                >
                  {module.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {module.status}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/modules/${module.id}`}>Abrir</Link>
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay módulos creados.
          </p>
        )}
      </div>
    </div>
  );
}
