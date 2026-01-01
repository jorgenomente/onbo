'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';

const createSchema = z.object({
  locationId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
});

export async function createModuleForLocation(input: {
  locationId: string;
  title: string;
  description?: string | null;
  status?: 'draft' | 'published';
  revalidatePathname?: string;
}) {
  const parsed = createSchema.safeParse(input);
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

  const profile = await getCurrentProfile();
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

  const { error } = await supabase.from('modules').insert({
    org_id: profile?.org_id ?? null,
    group_id: location.group_id,
    location_id: parsed.data.locationId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status ?? 'draft',
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[modules] create for location', error);
    }
    throw new Error(error.message ?? 'No se pudo crear el curso.');
  }

  if (input.revalidatePathname) {
    revalidatePath(input.revalidatePathname);
  }
}
