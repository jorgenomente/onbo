'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addGroupAdminByEmail } from '@/server/actions/superadmin/addGroupAdminByEmail';

type GroupAdminFormProps = {
  groupId: string;
};

export default function GroupAdminForm({ groupId }: GroupAdminFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await addGroupAdminByEmail({ groupId, email });
        setEmail('');
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo agregar admin.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <Input
        name="email"
        type="email"
        placeholder="Email del admin"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Agregando...' : 'Agregar como group_admin'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
