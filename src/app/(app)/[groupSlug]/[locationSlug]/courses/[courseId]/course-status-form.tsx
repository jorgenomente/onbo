'use client';

import { useState, useTransition } from 'react';

import { setCourseStatus } from '@/server/actions/courses/setCourseStatus';

type CourseStatus = 'draft' | 'published';

type CourseStatusFormProps = {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  status: CourseStatus;
};

export default function CourseStatusForm({
  groupSlug,
  locationSlug,
  courseId,
  status,
}: CourseStatusFormProps) {
  const [value, setValue] = useState<CourseStatus>(status);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextStatus: CourseStatus) {
    setValue(nextStatus);
    setMessage(null);
    startTransition(async () => {
      try {
        await setCourseStatus({
          groupSlug,
          locationSlug,
          courseId,
          status: nextStatus,
        });
        setMessage('Guardado');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'No se pudo guardar.';
        setMessage(errorMessage);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as CourseStatus)}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        disabled={isPending}
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
      <span className="text-xs text-muted-foreground">
        {isPending ? 'Guardando…' : message ?? ' '}
      </span>
    </div>
  );
}
