'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import ResourceCard, { type ResourceItem } from '@/components/resources/ResourceCard';
import { deleteCourseResource } from '@/server/actions/resources/deleteCourseResource';

type CourseResourceRowProps = {
  resource: ResourceItem;
  groupSlug: string;
  locationSlug: string;
  courseId: string;
};

export default function CourseResourceRow({
  resource,
  groupSlug,
  locationSlug,
  courseId,
}: CourseResourceRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteCourseResource({
          groupSlug,
          locationSlug,
          courseId,
          resourceId: resource.id,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo borrar.';
        setError(message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <ResourceCard resource={resource} />
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Borrando…' : 'Borrar'}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}
