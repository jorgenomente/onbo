'use client';

import { useActionState, useState } from 'react';

import { inviteEmployee, type InviteEmployeeState } from '@/server/actions/invites/inviteEmployee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CourseOption = {
  id: string;
  title: string;
  interval_days_default: number;
};

type InviteEmployeeFormProps = {
  courses: CourseOption[];
};

const initialState: InviteEmployeeState = {
  ok: false,
  error: undefined,
  message: undefined,
  dev_link: undefined,
  invite_id: undefined,
};

export default function InviteEmployeeForm({ courses }: InviteEmployeeFormProps) {
  const [state, formAction] = useActionState(inviteEmployee, initialState);
  const defaultCourse = courses[0];
  const [copied, setCopied] = useState(false);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="auto_assign_course"
          name="auto_assign_course"
          type="checkbox"
          value="true"
          defaultChecked={false}
        />
        <Label htmlFor="auto_assign_course">
          Asignar curso automáticamente
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="course_id">Curso</Label>
        <select
          id="course_id"
          name="course_id"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={defaultCourse?.id ?? ''}
        >
          <option value="">Sin curso</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interval_days">Intervalo (días)</Label>
        <Input
          id="interval_days"
          name="interval_days"
          type="number"
          min={1}
          defaultValue={defaultCourse?.interval_days_default ?? 4}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      {state.dev_link ? (
        <div className="space-y-2 rounded-md border bg-muted px-3 py-2 text-xs">
          {state.invite_id ? (
            <div className="text-xs text-muted-foreground">
              Invite ID: {state.invite_id}
            </div>
          ) : null}
          <Input readOnly value={state.dev_link} className="text-xs" />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.dev_link ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
            <a className="underline" href={state.dev_link} target="_blank" rel="noreferrer">
              Abrir
            </a>
          </div>
        </div>
      ) : null}

      <Button type="submit">Enviar invitación</Button>
    </form>
  );
}
