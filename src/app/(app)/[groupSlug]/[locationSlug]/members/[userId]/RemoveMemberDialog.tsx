'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type RemoveMemberDialogProps = {
  userId: string;
  action: (formData: FormData) => void;
};

export default function RemoveMemberDialog({
  userId,
  action,
}: RemoveMemberDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Remover del location</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover miembro</DialogTitle>
          <DialogDescription>
            Esta accion elimina al usuario del location. Podra ser invitado de
            nuevo mas adelante.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="user_id" value={userId} />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
