'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inviteLocationMemberByEmail } from '@/server/actions/locations/inviteLocationMemberByEmail';

type InviteFormProps = {
  locationId: string;
};

export default function InviteForm({ locationId }: InviteFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'trainer' | 'employee'>('employee');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await inviteLocationMemberByEmail({
          locationId,
          email,
          role,
        });
        setEmail('');
        setRole('employee');
        if (result.mode === 'assigned_existing') {
          setSuccess('Usuario existente asignado y email enviado.');
        } else {
          setSuccess('Invitación enviada.');
        }
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo enviar la invitación.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <Input
        name="email"
        type="email"
        placeholder="Email del empleado"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as 'trainer' | 'employee')}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="employee">Employee</option>
        <option value="trainer">Trainer</option>
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar invitación'}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
