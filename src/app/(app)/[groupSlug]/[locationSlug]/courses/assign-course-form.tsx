'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cloneCourseToLocation } from '@/server/actions/courses/cloneCourseToLocation';

type LegacyCourse = {
  id: string;
  org_id: string | null;
  title: string;
  status?: string | null;
};

type AssignCourseFormProps = {
  locationId: string;
  revalidatePathname: string;
  legacyCourses: LegacyCourse[];
  locationName: string;
  groupSlug: string;
  locationSlug: string;
  showOrgId?: boolean;
};

export default function AssignCourseForm({
  locationId,
  revalidatePathname,
  legacyCourses,
  locationName,
  groupSlug,
  locationSlug,
  showOrgId = false,
}: AssignCourseFormProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(legacyCourses[0]?.id ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [createdCourseTitle, setCreatedCourseTitle] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const selectedCourse = legacyCourses.find(
      (course) => course.id === selectedId,
    );
    if (selectedCourse && locationName) {
      setNewTitle(`${selectedCourse.title} — ${locationName}`);
    }
  }, [legacyCourses, locationName, selectedId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedCourseId(null);
    setCreatedCourseTitle(null);

    if (!selectedId) {
      setError('Selecciona un curso.');
      return;
    }

    if (!newTitle.trim() || newTitle.trim().length < 3) {
      setError('Ingresa un nombre valido para la copia.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await cloneCourseToLocation({
          sourceCourseId: selectedId,
          targetLocationId: locationId,
          newCourseTitle: newTitle.trim(),
        });
        setSuccess('Curso copiado.');
        setCreatedCourseId(result.newCourseId);
        setCreatedCourseTitle(result.newCourseTitle ?? newTitle.trim());
        toast.success('Curso copiado');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo copiar el curso.';
        setError(message);
        toast.error(message);
      }
    });
  }

  if (!legacyCourses.length) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="text-sm font-semibold">Asignar curso existente</div>
      <select
        name="legacy_course_id"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        disabled={isPending}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {legacyCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {showOrgId && course.org_id
              ? `${course.title} · ${course.org_id.slice(0, 8)}`
              : course.title}
          </option>
        ))}
      </select>
      <div className="space-y-1">
        <label htmlFor="new-title" className="text-xs font-medium text-muted-foreground">
          Nuevo nombre del curso (copia)
        </label>
        <Input
          id="new-title"
          name="new_course_title"
          placeholder="Ej: Introduccion a la marca — Sushi"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          disabled={isPending}
          required
          minLength={3}
        />
        <p className="text-xs text-muted-foreground">
          Esto crea una copia independiente. Editar la copia no modifica el curso
          original.
        </p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Copiando...' : 'Copiar a este local'}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {createdCourseId ? (
        <Button asChild variant="link" className="h-auto px-0 text-sm">
          <a
            href={`/${groupSlug}/${locationSlug}/courses/${createdCourseId}?view=builder`}
          >
            Abrir builder{createdCourseTitle ? `: ${createdCourseTitle}` : ''}
          </a>
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
