'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createGroup } from '@/server/actions/superadmin/createGroup';

export default function GroupForm() {
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
        await createGroup({ name, slug });
        setName('');
        setSlug('');
        router.push('/onbo');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo crear el group.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <Input
        name="name"
        placeholder="Nombre del group"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Input
        name="slug"
        placeholder="Slug (ej: fabricgroup)"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear group'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
