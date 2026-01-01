'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type ReorderUnitsState = { error: string | null };

const reorderUnitsSchema = z.object({
  unit_id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

const reorderLocationUnitsSchema = z.object({
  unit_id: z.string().uuid(),
  module_id: z.string().uuid(),
  location_id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function reorderUnits(
  formDataOrState: FormData | ReorderUnitsState,
  maybeFormData?: FormData,
): Promise<ReorderUnitsState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const locationId = formData.get('location_id');
  if (locationId) {
    const parsed = reorderLocationUnitsSchema.safeParse({
      unit_id: formData.get('unit_id'),
      module_id: formData.get('module_id'),
      location_id: locationId,
      direction: formData.get('direction'),
    });

    if (!parsed.success) {
      return { error: 'Datos invalidos.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
    const isSuperAdmin =
      !!user.email && allowlist.includes(user.email.toLowerCase());

    const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;

    const { data: moduleData } = await dataClient
      .from('modules')
      .select('id, location_id, group_id')
      .eq('id', parsed.data.module_id)
      .maybeSingle();

    if (!moduleData || moduleData.location_id !== parsed.data.location_id) {
      return { error: 'Curso no encontrado.' };
    }

    if (!isSuperAdmin) {
      const { data: groupMembership } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', moduleData.group_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: locationMembership } = await supabase
        .from('location_memberships')
        .select('role')
        .eq('location_id', parsed.data.location_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isGroupAdmin = groupMembership?.role === 'group_admin';
      const isLocationManager =
        locationMembership?.role === 'location_admin' ||
        locationMembership?.role === 'trainer';

      if (!isGroupAdmin && !isLocationManager) {
        return { error: 'No autorizado.' };
      }
    }

    const { data: unit } = await dataClient
      .from('module_units')
      .select('id, module_id, order_index')
      .eq('id', parsed.data.unit_id)
      .eq('module_id', parsed.data.module_id)
      .maybeSingle();

    if (!unit) {
      return { error: 'Unidad no encontrada.' };
    }

    const neighborQuery = dataClient
      .from('module_units')
      .select('id, order_index')
      .eq('module_id', parsed.data.module_id);

    const { data: neighbor } =
      parsed.data.direction === 'up'
        ? await neighborQuery
            .lt('order_index', unit.order_index ?? 0)
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await neighborQuery
            .gt('order_index', unit.order_index ?? 0)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

    if (!neighbor) {
      return { error: null };
    }

    const { error: updateUnitError } = await dataClient
      .from('module_units')
      .update({ order_index: neighbor.order_index })
      .eq('id', unit.id);

    const { error: updateNeighborError } = await dataClient
      .from('module_units')
      .update({ order_index: unit.order_index })
      .eq('id', neighbor.id);

    if (updateUnitError || updateNeighborError) {
      return { error: 'No se pudo reordenar la unidad.' };
    }

    const { data: location } = await dataClient
      .from('locations')
      .select('id, slug, group_id')
      .eq('id', parsed.data.location_id)
      .maybeSingle();

    const { data: group } = location
      ? await dataClient
          .from('groups')
          .select('id, slug')
          .eq('id', location.group_id)
          .maybeSingle()
      : { data: null };

    if (location && group) {
      revalidatePath(`/${group.slug}/${location.slug}/courses/${moduleData.id}/lessons`);
    }

    return { error: null };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { error: 'No autorizado.' };
  }

  const parsed = reorderUnitsSchema.safeParse({
    unit_id: formData.get('unit_id'),
    direction: formData.get('direction'),
  });

  if (!parsed.success) {
    return { error: 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: unit } = await supabase
    .from('module_units')
    .select('id, module_id, order_index')
    .eq('id', parsed.data.unit_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!unit) {
    return { error: 'Unidad no encontrada.' };
  }

  const neighborQuery = supabase
    .from('module_units')
    .select('id, order_index')
    .eq('module_id', unit.module_id)
    .eq('org_id', profile.org_id);

  const { data: neighbor } =
    parsed.data.direction === 'up'
      ? await neighborQuery
          .lt('order_index', unit.order_index ?? 0)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt('order_index', unit.order_index ?? 0)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

  if (!neighbor) {
    return { error: null };
  }

  const { error: updateUnitError } = await supabase
    .from('module_units')
    .update({ order_index: neighbor.order_index })
    .eq('id', unit.id)
    .eq('org_id', profile.org_id);

  const { error: updateNeighborError } = await supabase
    .from('module_units')
    .update({ order_index: unit.order_index })
    .eq('id', neighbor.id)
    .eq('org_id', profile.org_id);

  if (updateUnitError || updateNeighborError) {
    return { error: 'No se pudo reordenar la unidad.' };
  }

  revalidatePath(`/admin/courses/${unit.module_id}`);
  revalidatePath(`/modules/${unit.module_id}`);
  return { error: null };
}
