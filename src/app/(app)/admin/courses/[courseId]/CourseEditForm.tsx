'use client';

import { useActionState } from 'react';

import { updateCourse } from '@/server/actions/courses/updateCourse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CourseEditFormProps = {
  course: {
    id: string;
    title: string;
    description: string | null;
    interval_days_default: number;
    status: string;
  };
};

const initialState = { error: null };

export default function CourseEditForm({ course }: CourseEditFormProps) {
  const [state, formAction] = useActionState(updateCourse, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="course_id" value={course.id} />
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={course.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={course.description ?? ''}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="interval_days_default">Intervalo (días)</Label>
        <Input
          id="interval_days_default"
          name="interval_days_default"
          type="number"
          min={1}
          defaultValue={course.interval_days_default}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          name="status"
          defaultValue={course.status}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit">Guardar</Button>
    </form>
  );
}
