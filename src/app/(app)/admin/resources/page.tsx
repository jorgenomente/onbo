import { notFound, redirect } from 'next/navigation';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getOrgResources } from '@/server/queries/resources/getOrgResources';
import { upsertOrgResource } from '@/server/actions/resources/upsertOrgResource';
import { deleteOrgResource } from '@/server/actions/resources/deleteOrgResource';

export default async function AdminResourcesPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  if (!profile.org_id) {
    notFound();
  }

  const resources = await getOrgResources(profile.org_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recursos de la empresa</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona recursos visibles para toda la organizacion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar recurso</CardTitle>
          <CardDescription>Completa los datos y guarda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              await upsertOrgResource(formData);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <Input name="title" placeholder="Titulo" required />
            <select
              name="type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue="link"
            >
              <option value="link">Link</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
            <Input name="url" placeholder="URL" required />
            <Input name="order_index" type="number" min={0} defaultValue={0} />
            <div className="md:col-span-2">
              <Textarea name="description" placeholder="Descripcion" />
            </div>
            <Button type="submit" className="md:col-span-2">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {resources.length ? (
          resources.map((resource) => (
            <Card key={resource.id} className="gap-3 py-4">
              <CardContent className="space-y-3">
                <form
                  action={async (formData) => {
                    await upsertOrgResource(formData);
                  }}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <Input name="title" defaultValue={resource.title} required />
                  <select
                    name="type"
                    defaultValue={resource.type}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="link">Link</option>
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <Input name="url" defaultValue={resource.url} required />
                  <Input
                    name="order_index"
                    type="number"
                    min={0}
                    defaultValue={resource.order_index}
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      name="description"
                      defaultValue={resource.description ?? ''}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <Button type="submit" size="sm">
                      Guardar
                    </Button>
                  </div>
                </form>
                <form
                  action={async (formData) => {
                    await deleteOrgResource(formData);
                  }}
                >
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <Button type="submit" size="sm" variant="destructive">
                    Eliminar
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No hay recursos.</p>
        )}
      </div>
    </div>
  );
}
