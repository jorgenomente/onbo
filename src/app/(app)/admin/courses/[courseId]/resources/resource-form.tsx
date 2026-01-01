'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { upsertModuleResource } from '@/server/actions/resources/upsertModuleResource';

type ResourceFormProps = {
  moduleId: string;
};

export default function ResourceForm({ moduleId }: ResourceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await upsertModuleResource({ moduleId, title, url });
        setTitle('');
        setUrl('');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo guardar el recurso.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <Input
        name="title"
        placeholder="Nombre del recurso"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        name="url"
        placeholder="URL"
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <Button type="submit" className="md:col-span-2" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </Button>
      {error ? (
        <p className="md:col-span-2 text-sm text-destructive">{error}</p>
      ) : null}
    </form>
  );
}
