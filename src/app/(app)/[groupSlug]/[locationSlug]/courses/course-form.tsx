'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createModuleForLocation } from '@/server/actions/modules/createModuleForLocation';

type CourseFormProps = {
  locationId: string;
  revalidatePathname: string;
};

export default function CourseForm({
  locationId,
  revalidatePathname,
}: CourseFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await createModuleForLocation({
          locationId,
          title,
          description: description || null,
          status,
          revalidatePathname,
        });
        setTitle('');
        setDescription('');
        setStatus('draft');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo crear el curso.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <Input
        name="title"
        placeholder="Titulo del curso"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <Textarea
        name="description"
        placeholder="Descripcion (opcional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <select
        name="status"
        value={status}
        onChange={(event) =>
          setStatus(event.target.value as 'draft' | 'published')
        }
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear curso'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
