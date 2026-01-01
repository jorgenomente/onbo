'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inviteGroupAdminByEmail } from '@/server/actions/superadmin/inviteGroupAdminByEmail';

type InviteAdminFormProps = {
  groupId: string;
};

export default function InviteAdminForm({ groupId }: InviteAdminFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await inviteGroupAdminByEmail({ groupId, email });
        setEmail('');
        setSuccess('Invitación enviada.');
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
        placeholder="Email del nuevo admin"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar invitación'}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
