'use server';

import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export async function getLocationInvites(locationId: string) {
  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from('location_invites')
    .select('id, email, role, status, created_at, accepted_at, token')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[invites] list', error);
    }
    throw new Error('No se pudieron cargar invitaciones.');
  }

  return data ?? [];
}
