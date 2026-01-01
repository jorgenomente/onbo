'use server';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export async function getUserEmailsByIds(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, string | null>();
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[tenancy] list users', error);
    }
    throw new Error('No se pudo cargar emails de usuarios.');
  }

  const emailById = new Map<string, string | null>();
  const usersById = new Map(
    data.users.map((user) => [user.id, user.email ?? null]),
  );

  userIds.forEach((id) => {
    emailById.set(id, usersById.get(id) ?? null);
  });

  return emailById;
}
