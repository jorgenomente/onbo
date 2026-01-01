'use server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AuthInfo = {
  email: string | null;
  last_sign_in_at: string | null;
};

export async function getUserAuthInfoByIds(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, AuthInfo>();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error('No se pudo cargar info de usuarios.');
  }

  const usersById = new Map(
    data.users.map((user) => [
      user.id,
      {
        email: user.email ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      },
    ]),
  );

  const infoById = new Map<string, AuthInfo>();
  userIds.forEach((id) => {
    const info = usersById.get(id);
    if (info) {
      infoById.set(id, info);
    }
  });

  return infoById;
}
