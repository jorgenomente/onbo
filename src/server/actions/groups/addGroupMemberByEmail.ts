'use server';

import { z } from 'zod';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const addSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function addGroupMemberByEmail(input: {
  groupId: string;
  email: string;
}) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', parsed.data.groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'group_admin') {
    throw new Error('No autorizado.');
  }

  const adminClient = createSupabaseAdminClient();
  const { data: usersData, error: usersError } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[groups] list users', usersError);
    }
    throw new Error('No se pudo buscar el usuario.');
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const targetUser = usersData.users.find(
    (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
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
      role: 'group_member',
    },
    { onConflict: 'group_id,user_id', ignoreDuplicates: true },
  );

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[groups] add group member', error);
    }
    throw new Error(error.message ?? 'No se pudo agregar el miembro.');
  }
}
