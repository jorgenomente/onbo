'use client';

import { useActionState } from 'react';

import { setCourseModules } from '@/server/actions/courses/setCourseModules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ModuleOption = {
  id: string;
  title: string;
};

type CourseModuleItem = {
  module_id: string;
  order_index: number;
};

type CourseModulesFormProps = {
  courseId: string;
  modules: ModuleOption[];
  courseModules: CourseModuleItem[];
};

const initialState = { error: null };

export default function CourseModulesForm({
  courseId,
  modules,
  courseModules,
}: CourseModulesFormProps) {
  const [state, formAction] = useActionState(setCourseModules, initialState);
  const selected = new Map(
    courseModules.map((item) => [item.module_id, item.order_index]),
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="course_id" value={courseId} />
      <div className="space-y-2">
        {modules.map((module) => {
          const orderIndex = selected.get(module.id) ?? 0;
          return (
            <label
              key={module.id}
              className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="module_id"
                value={module.id}
                defaultChecked={selected.has(module.id)}
              />
              <span className="flex-1 font-medium">{module.title}</span>
              <Input
                name={`order_${module.id}`}
                type="number"
                min={0}
                className="h-8 w-20"
                defaultValue={orderIndex}
              />
            </label>
          );
        })}
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit">Guardar módulos</Button>
    </form>
  );
}
