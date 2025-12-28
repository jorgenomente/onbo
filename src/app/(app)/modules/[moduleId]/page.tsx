import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createLesson } from '@/server/actions/createLesson';
import { deleteLesson } from '@/server/actions/deleteLesson';
import { deleteModule } from '@/server/actions/deleteModule';
import { createAssignment } from '@/server/actions/assignments/createAssignment';
import { deleteAssignment } from '@/server/actions/assignments/deleteAssignment';
import { toggleLessonCompleted } from '@/server/actions/progress/toggleLessonCompleted';
import { updateLesson } from '@/server/actions/updateLesson';
import { updateModule } from '@/server/actions/updateModule';

type PageProps = {
  params: { moduleId: string };
};

export default async function ModuleDetailPage({ params }: PageProps) {
  const profile = await getCurrentProfile();
  const resolvedParams = await Promise.resolve(params);
  const moduleId = resolvedParams?.moduleId;

  console.log('[modules/detail] params:', params);
  console.log('[modules/detail] resolved params:', resolvedParams);
  console.log('[modules/detail] moduleId:', moduleId);

  if (!moduleId) {
    console.error('[modules/detail] missing moduleId', { params, resolvedParams });
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const { data: moduleData, error: moduleError } = await supabase
    .from('modules')
    .select('id, title, description, status, order_index')
    .eq('id', moduleId)
    .eq('org_id', profile?.org_id ?? '')
    .single();

  if (authError || !authData?.user) {
    return (
      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <h1 className="text-lg font-semibold">AUTH DEBUG</h1>
        <p>moduleId: {moduleId}</p>
        <p>authError: {authError?.message ?? 'none'}</p>
        <p>user: {authData?.user?.id ?? 'null'}</p>
      </div>
    );
  }

  if (moduleError || !moduleData) {
    console.error('[modules/detail] module query failed', {
      moduleId,
      error: moduleError?.message ?? null,
    });
    notFound();
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, user_id, due_date, status')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  const { data: employees } = await supabase
    .from('profiles')
    .select('user_id, full_name, role')
    .eq('org_id', profile?.org_id ?? '')
    .eq('role', 'employee')
    .order('full_name', { ascending: true });

  const isAdmin = profile ? isAdminLike(profile.role) : false;
  const isEmployee = profile?.role === 'employee';

  if (!isAdmin && moduleData.status !== 'published') {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">No disponible</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo aún no está publicado.
        </p>
        <Button asChild variant="outline">
          <Link href="/home">Volver</Link>
        </Button>
      </div>
    );
  }

  const { data: progress } = isEmployee
    ? await supabase
        .from('progress')
        .select('lesson_id')
        .eq('user_id', profile?.user_id ?? '')
        .eq('module_id', moduleId)
    : { data: [] };

  const completedLessonIds = new Set(
    (progress ?? []).map((item) => item.lesson_id),
  );
  const totalLessons = lessons?.length ?? 0;
  const completedCount = completedLessonIds.size;
  const completionPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const completedAssignment =
    totalLessons > 0 && completedCount === totalLessons;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{moduleData.title}</h1>
        <p className="text-xs text-muted-foreground">ID: {moduleData.id}</p>
        {moduleData.description ? (
          <p className="text-sm text-muted-foreground">
            {moduleData.description}
          </p>
        ) : null}
      </div>

      {isEmployee ? (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">
            Progreso: {completedCount}/{totalLessons} completadas
          </p>
          <p className="text-xs text-muted-foreground">
            {completionPercent}% completado
          </p>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Editar módulo</h2>
          <form action={updateModule} className="mt-4 space-y-4">
            <input type="hidden" name="module_id" value={moduleData.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                defaultValue={moduleData.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={moduleData.description ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                name="status"
                defaultValue={moduleData.status}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <Button type="submit">Guardar</Button>
          </form>
          <form action={deleteModule} className="mt-3">
            <input type="hidden" name="module_id" value={moduleData.id} />
            <Button type="submit" variant="destructive">
              Eliminar
            </Button>
          </form>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Asignar a usuario</h2>
          <form action={createAssignment} className="space-y-3">
            <input type="hidden" name="module_id" value={moduleData.id} />
            <div className="space-y-2">
              <Label htmlFor="assignee">Empleado</Label>
              <select
                id="assignee"
                name="user_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Seleccionar empleado</option>
                {employees?.map((employee) => (
                  <option key={employee.user_id} value={employee.user_id}>
                    {employee.full_name ?? employee.user_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha límite</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <Button type="submit">Asignar</Button>
          </form>

          <div className="space-y-2">
            {assignments?.length ? (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{assignment.user_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {assignment.due_date ?? 'Sin fecha límite'}
                    </div>
                  </div>
                  <form action={deleteAssignment}>
                    <input
                      type="hidden"
                      name="assignment_id"
                      value={assignment.id}
                    />
                    <input
                      type="hidden"
                      name="module_id"
                      value={moduleData.id}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      Quitar
                    </Button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay asignaciones todavía.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lecciones</h2>
          {isAdmin ? (
            <span className="text-xs text-muted-foreground">
              Total: {lessons?.length ?? 0}
            </span>
          ) : null}
        </div>

        {isAdmin ? (
          <form action={createLesson} className="space-y-3 rounded-lg border p-4">
            <input type="hidden" name="module_id" value={moduleData.id} />
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Nueva lección</Label>
              <Input
                id="lesson-title"
                name="title"
                placeholder="Introducción"
                required
              />
            </div>
            <Button type="submit">Crear lección</Button>
          </form>
        ) : null}

        <div className="space-y-2">
          {lessons?.length ? (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{lesson.title}</span>
                  {!isAdmin ? null : (
                    <form action={deleteLesson}>
                      <input type="hidden" name="lesson_id" value={lesson.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Borrar
                      </Button>
                    </form>
                  )}
                </div>
                {isEmployee ? (
                  <form action={toggleLessonCompleted}>
                    <input type="hidden" name="module_id" value={moduleId} />
                    <input type="hidden" name="lesson_id" value={lesson.id} />
                    <input
                      type="hidden"
                      name="completed"
                      value={
                        completedLessonIds.has(lesson.id) ? 'false' : 'true'
                      }
                    />
                    <Button type="submit" size="sm" variant="outline">
                      {completedLessonIds.has(lesson.id)
                        ? 'Desmarcar'
                        : 'Marcar como completada'}
                    </Button>
                  </form>
                ) : null}
                {isAdmin ? (
                  <form action={updateLesson} className="flex gap-2">
                    <input type="hidden" name="lesson_id" value={lesson.id} />
                    <Input
                      name="title"
                      defaultValue={lesson.title}
                      className="h-8"
                    />
                    <Button type="submit" size="sm">
                      Guardar
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay lecciones todavía.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
