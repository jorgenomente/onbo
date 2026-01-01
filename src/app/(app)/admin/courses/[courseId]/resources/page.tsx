import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getModuleResources } from '@/server/queries/resources/getModuleResources';
import { deleteModuleResource } from '@/server/actions/resources/deleteModuleResource';
import ResourceForm from './resource-form';

const moduleIdSchema = z.string().uuid();

export default async function ModuleResourcesAdminPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  if (!profile.org_id) {
    notFound();
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: module } = await supabase
    .from('modules')
    .select('id, title')
    .eq('id', parsedModuleId.data)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!module) {
    notFound();
  }

  const resources = await getModuleResources(module.id, profile.org_id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Recursos del curso</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/courses/${module.id}`}>Volver al builder</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Agregar recurso</CardTitle>
          <CardDescription>Completa los datos y guarda.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm moduleId={module.id} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {resources.length ? (
          resources.map((resource) => (
            <Card key={resource.id} className="gap-3 py-4">
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">{resource.url}</p>
                </div>
                <form
                  action={async (formData) => {
                    await deleteModuleResource(formData);
                  }}
                >
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <input type="hidden" name="module_id" value={module.id} />
                  <Button type="submit" size="sm" variant="destructive">
                    Eliminar
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavia no hay recursos.
          </p>
        )}
      </div>
    </div>
  );
}
