'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCourseResource } from '@/server/actions/resources/createCourseResource';

type CourseResourceFormProps = {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
};

export default function CourseResourceForm({
  groupSlug,
  locationSlug,
  courseId,
}: CourseResourceFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await createCourseResource({
          groupSlug,
          locationSlug,
          courseId,
          name,
          url,
        });
        setName('');
        setUrl('');
        setSuccess('Recurso guardado.');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo guardar.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <label htmlFor="resource-name" className="text-sm font-medium">
          Nombre del recurso
        </label>
        <Input
          id="resource-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Manual de tienda"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="resource-url" className="text-sm font-medium">
          URL
        </label>
        <Input
          id="resource-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/manual.pdf"
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar recurso'}
      </Button>
      {success ? <p className="text-xs text-emerald-600">{success}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
