'use client';

import { useActionState, useState } from 'react';

import { resendInvite, type ResendInviteState } from '@/server/actions/invites/resendInvite';
import { Button } from '@/components/ui/button';

type PendingInviteRowProps = {
  invite: {
    id: string;
    email: string;
    status: string;
    created_at: string;
    invited_user_id: string | null;
    last_sent_at: string | null;
    send_count: number | null;
  };
  children?: React.ReactNode;
};

const initialState: ResendInviteState = {
  ok: false,
  mode: undefined,
  message: undefined,
  dev_link: undefined,
  invite_id: undefined,
  error: undefined,
};

export default function PendingInviteRow({ invite, children }: PendingInviteRowProps) {
  const [state, formAction] = useActionState(resendInvite, initialState);
  const [copied, setCopied] = useState(false);
  const devLink = state.dev_link;
  const inviteId = state.invite_id ?? invite.id;

  return (
    <div className="flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{invite.email}</div>
          <div className="text-xs text-muted-foreground">
            Enviada: {new Date(invite.created_at).toLocaleDateString()}
            {invite.last_sent_at
              ? ` · Último envío: ${new Date(invite.last_sent_at).toLocaleDateString()}`
              : ''}
            {typeof invite.send_count === 'number'
              ? ` · Envios: ${invite.send_count}`
              : ''}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{invite.status}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="invite_id" value={invite.id} />
          <Button type="submit" size="sm" variant="outline">
            Reenviar
          </Button>
        </form>
        {children}
      </div>
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
      {state.mode === 'link_generated' && devLink ? (
        <div className="space-y-2 rounded-md border bg-muted px-3 py-2 text-xs">
          <div className="text-xs text-muted-foreground">
            Invite ID: {inviteId}
          </div>
          <input
            readOnly
            value={devLink}
            className="w-full rounded-md border bg-background px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="underline"
              onClick={async () => {
                await navigator.clipboard.writeText(devLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
            <a className="underline" href={devLink} target="_blank" rel="noreferrer">
              Abrir
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
