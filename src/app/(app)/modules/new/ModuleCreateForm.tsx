'use client';

import { useActionState } from 'react';

import { createModule } from '@/server/actions/createModule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialState = { error: null };

export default function ModuleCreateForm() {
  const [state, formAction] = useActionState(createModule, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" placeholder="Bienvenida" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Descripción breve del módulo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          name="status"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue="draft"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit">Crear módulo</Button>
    </form>
  );
}
