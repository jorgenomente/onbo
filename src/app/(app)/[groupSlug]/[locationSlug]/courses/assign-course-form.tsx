'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { assignModuleToLocation } from '@/server/actions/modules/assignModuleToLocation';

type LegacyCourse = {
  id: string;
  title: string;
};

type AssignCourseFormProps = {
  locationId: string;
  revalidatePathname: string;
  legacyCourses: LegacyCourse[];
};

export default function AssignCourseForm({
  locationId,
  revalidatePathname,
  legacyCourses,
}: AssignCourseFormProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(legacyCourses[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedId) {
      setError('Selecciona un curso.');
      return;
    }

    startTransition(async () => {
      try {
        await assignModuleToLocation({
          moduleId: selectedId,
          locationId,
          revalidatePathname,
        });
        setSuccess('Curso asignado.');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo asignar el curso.';
        setError(message);
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
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {legacyCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Asignando...' : 'Asignar a este local'}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
