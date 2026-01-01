'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const assignSchema = z.object({
  moduleId: z.string().uuid(),
  locationId: z.string().uuid(),
  revalidatePathname: z.string().min(1),
});

export async function assignModuleToLocation(input: {
  moduleId: string;
  locationId: string;
  revalidatePathname: string;
}) {
  const parsed = assignSchema.safeParse(input);
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

  const { data: location } = await supabase
    .from('locations')
    .select('id, group_id')
    .eq('id', parsed.data.locationId)
    .maybeSingle();

  if (!location) {
    throw new Error('Local no encontrado o sin acceso.');
  }

  const { data: groupMembership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', location.group_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: locationMembership } = await supabase
    .from('location_memberships')
    .select('role')
    .eq('location_id', location.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const canManageCourses =
    groupMembership?.role === 'group_admin' ||
    locationMembership?.role === 'location_admin' ||
    locationMembership?.role === 'trainer';

  if (!canManageCourses) {
    throw new Error('No autorizado.');
  }

  const adminClient = createServiceRoleClient();
  const { data: moduleRow } = await adminClient
    .from('modules')
    .select('id, location_id')
    .eq('id', parsed.data.moduleId)
    .maybeSingle();

  if (!moduleRow) {
    throw new Error('Curso no encontrado.');
  }

  if (moduleRow.location_id) {
    throw new Error('Este curso ya tiene un local asignado.');
  }

  const { error } = await adminClient
    .from('modules')
    .update({ location_id: parsed.data.locationId })
    .eq('id', parsed.data.moduleId)
    .is('location_id', null);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[modules] assign location', error);
    }
    throw new Error(error.message ?? 'No se pudo asignar el curso.');
  }

  revalidatePath(parsed.data.revalidatePathname);
}
