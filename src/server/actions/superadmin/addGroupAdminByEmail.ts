'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSuperAdmin } from '@/server/auth/requireSuperAdmin';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const addSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function addGroupAdminByEmail(input: {
  groupId: string;
  email: string;
}) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data: userData, error: userError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (userError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] list users', userError);
    }
    throw new Error('No se pudo buscar el usuario.');
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const targetUser = userData.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );

  if (!targetUser) {
    throw new Error(
      'Ese email aun no tiene cuenta; invitalo o pidelo que se registre.',
    );
  }

  const { error } = await supabase.from('group_memberships').upsert(
    {
      group_id: parsed.data.groupId,
      user_id: targetUser.id,
      role: 'group_admin',
      email: normalizedEmail,
    },
    { onConflict: 'group_id,user_id' },
  );

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[onbo] add group admin', error);
    }
    throw new Error(error.message ?? 'No se pudo asignar el admin.');
  }

  revalidatePath(`/onbo/groups/${parsed.data.groupId}`);
}
