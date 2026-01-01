'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createLocationForGroup } from '@/server/actions/superadmin/createLocationForGroup';

type LocationFormProps = {
  groupId: string;
};

export default function LocationForm({ groupId }: LocationFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await createLocationForGroup({ groupId, name, slug });
        setName('');
        setSlug('');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo crear el local.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <Input
        name="name"
        placeholder="Nombre del local"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Input
        name="slug"
        placeholder="Slug (ej: tigremorado)"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear local'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
