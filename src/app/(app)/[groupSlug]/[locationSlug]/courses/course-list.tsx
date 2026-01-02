'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renameCourse } from '@/server/actions/courses/renameCourse';
import { updateCourseStatus } from '@/server/actions/courses/updateCourseStatus';

type CourseListItem = {
  id: string;
  title: string;
  status: 'active' | 'archived' | null;
  created_at?: string | null;
};

type CourseListProps = {
  courses: CourseListItem[];
  basePath: string;
  canEditNames: boolean;
  isEmployeePreview: boolean;
  revalidatePathname: string;
};

export default function CourseList({
  courses,
  basePath,
  canEditNames,
  isEmployeePreview,
  revalidatePathname,
}: CourseListProps) {
  const [items, setItems] = useState<CourseListItem[]>(courses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setItems(courses);
  }, [courses]);

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  );

  function startEditing(item: CourseListItem) {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTitle('');
    setError(null);
  }

  function handleSubmit() {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setError('El nombre no puede estar vacio.');
      return;
    }

    if (!editingItem) {
      setError('Curso no encontrado.');
      return;
    }

    startTransition(async () => {
      try {
        const updated = await renameCourse({
          courseId: editingItem.id,
          newTitle: trimmed,
          revalidatePathname,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === updated.id ? { ...item, title: updated.title } : item,
          ),
        );
        toast.success('Nombre actualizado.');
        cancelEditing();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el curso.';
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleStatusChange(
    courseId: string,
    nextStatus: 'active' | 'archived',
  ) {
    setStatusError(null);
    if (process.env.NODE_ENV !== 'production') {
      const prev = items.find((item) => item.id === courseId)?.status ?? null;
      console.log('[courses][status-change]', {
        courseId,
        prevStatus: prev,
        nextStatus,
      });
    }
    startTransition(async () => {
      try {
        const updated = await updateCourseStatus({
          courseId,
          status: nextStatus,
          revalidatePathname,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === updated.id ? { ...item, status: updated.status } : item,
          ),
        );
        toast.success('Estado actualizado.');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el estado.';
        setStatusError(message);
        toast.error(message);
        if (
          process.env.NODE_ENV !== 'production' &&
          typeof message === 'string' &&
          message.trim().length > 0
        ) {
          console.warn('[courses][status-change][error]', {
            courseId,
            nextStatus,
            message,
          });
        }
      }
    });
  }

  const statusLabels = {
    active: 'Activo',
    archived: 'Archivado',
  } as const;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay cursos creados para este local.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((course) => {
        const isEditing = editingId === course.id;
        const canEdit = canEditNames && !isEmployeePreview;
        const statusValue = course.status ?? 'active';

        return (
          <div
            key={course.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
          >
            <div className="min-w-[200px] flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending}
                    autoFocus
                  />
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isPending}
                    >
                      {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      disabled={isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Link
                  href={
                    isEmployeePreview
                      ? `${basePath}/${course.id}/view`
                      : `${basePath}/${course.id}`
                  }
                  className="font-medium transition hover:text-foreground"
                >
                  {course.title}
                  {process.env.NODE_ENV !== 'production'
                    ? ` · ${course.id.slice(0, 8)}`
                    : ''}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit ? (
                <select
                  value={statusValue}
                  onChange={(event) =>
                    handleStatusChange(
                      course.id,
                      event.target.value as 'active' | 'archived',
                    )
                  }
                  disabled={isPending}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">{statusLabels.active}</option>
                  <option value="archived">{statusLabels.archived}</option>
                </select>
              ) : (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                  {course.status}
                </span>
              )}
              {canEdit && !isEditing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => startEditing(course)}
                >
                  Editar nombre
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
      {statusError ? (
        <p className="text-xs text-destructive">{statusError}</p>
      ) : null}
    </div>
  );
}
