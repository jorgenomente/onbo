'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { createOrganization } from '@/server/actions/createOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState = { error: null };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? 'Creando…' : 'Crear organización'}
    </Button>
  );
}

export default function CreateOrgForm() {
  const [state, formAction] = useActionState(
    createOrganization,
    initialState,
  );
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const helperText = useMemo(() => {
    if (!slug) return 'Usá letras minúsculas, números y guiones.';
    return `Tu workspace será: ${slug}`;
  }, [slug]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!slugEdited) {
              setSlug(slugify(nextName));
            }
          }}
          placeholder="Acme Inc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugEdited(true);
          }}
          placeholder="acme-inc"
          required
        />
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
