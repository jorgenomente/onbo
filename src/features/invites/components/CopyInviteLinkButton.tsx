'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type CopyInviteLinkButtonProps = {
  link: string;
};

export default function CopyInviteLinkButton({ link }: CopyInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? 'Copiado' : 'Copiar link'}
    </Button>
  );
}
