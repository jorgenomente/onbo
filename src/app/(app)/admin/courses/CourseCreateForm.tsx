'use client';

import { useActionState } from 'react';

import { createCourse } from '@/server/actions/courses/createCourse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialState = { error: null };

export default function CourseCreateForm() {
  const [state, formAction] = useActionState(createCourse, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="interval_days_default">Intervalo (días)</Label>
        <Input
          id="interval_days_default"
          name="interval_days_default"
          type="number"
          min={1}
          defaultValue={4}
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit">Crear curso</Button>
    </form>
  );
}
