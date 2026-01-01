'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { assignCourseToMember } from '@/server/actions/locations/assignCourseToMember';

type MemberOption = {
  userId: string;
  label: string;
};

type ModuleOption = {
  id: string;
  title: string;
};

type AssignmentFormProps = {
  locationId: string;
  revalidatePathname: string;
  members: MemberOption[];
  modules: ModuleOption[];
};

export default function AssignmentForm({
  locationId,
  revalidatePathname,
  members,
  modules,
}: AssignmentFormProps) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.userId ?? '');
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!memberId || !moduleId) {
      setError('Selecciona miembro y curso.');
      return;
    }

    startTransition(async () => {
      try {
        await assignCourseToMember({
          locationId,
          moduleId,
          userId: memberId,
          dueDate: dueDate || null,
          revalidatePathname,
        });
        setSuccess('Curso asignado.');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo asignar el curso.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="text-sm font-semibold">Asignar curso</div>
      <select
        name="member"
        value={memberId}
        onChange={(event) => setMemberId(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.label}
          </option>
        ))}
      </select>
      <select
        name="module"
        value={moduleId}
        onChange={(event) => setModuleId(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {modules.map((module) => (
          <option key={module.id} value={module.id}>
            {module.title}
          </option>
        ))}
      </select>
      <Input
        name="due_date"
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Asignando...' : 'Asignar'}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
