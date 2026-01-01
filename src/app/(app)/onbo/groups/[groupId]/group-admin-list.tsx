'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { resendInviteByUserId } from '@/server/actions/superadmin/resendInviteByUserId';

type AdminItem = {
  userId: string;
  groupId: string;
  email: string | null;
};

export default function GroupAdminList({ admins }: { admins: AdminItem[] }) {
  const [status, setStatus] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2 text-sm">
      {admins.map((admin) => (
        <div key={admin.userId} className="rounded-lg border px-3 py-2">
          <p className="font-medium">{admin.email ?? admin.userId}</p>
          <p className="text-xs text-muted-foreground">group_admin</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setStatus((prev) => ({ ...prev, [admin.userId]: null }));
                startTransition(async () => {
                  try {
                    await resendInviteByUserId({
                      groupId: admin.groupId,
                      userId: admin.userId,
                    });
                    setStatus((prev) => ({
                      ...prev,
                      [admin.userId]: 'Email enviado por Supabase.',
                    }));
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : 'No se pudo reenviar la invitación.';
                    setStatus((prev) => ({ ...prev, [admin.userId]: message }));
                  }
                });
              }}
            >
              Reenviar invitación
            </Button>
          </div>
          {status[admin.userId] ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {status[admin.userId]}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
