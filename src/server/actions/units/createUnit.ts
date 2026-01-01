'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

export type CreateUnitState = { error: string | null };

const createUnitSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
});

const createLocationUnitSchema = z.object({
  module_id: z.string().uuid(),
  location_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
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

export async function createUnit(
  formDataOrState: FormData | CreateUnitState,
  maybeFormData?: FormData,
): Promise<CreateUnitState> {
  const formData =
    formDataOrState instanceof FormData ? formDataOrState : maybeFormData;

  if (!formData) {
    return { error: 'Datos invalidos.' };
  }

  const locationId = formData.get('location_id');
  if (locationId) {
    const parsed = createLocationUnitSchema.safeParse({
      module_id: formData.get('module_id'),
      location_id: locationId,
      title: formData.get('title'),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.',
      };
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
      .select('id, location_id, group_id, org_id')
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

    const { data: lastUnit } = await dataClient
      .from('module_units')
      .select('order_index')
      .eq('module_id', parsed.data.module_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (lastUnit?.order_index ?? 0) + 1;

    const { error } = await dataClient.from('module_units').insert({
      org_id: moduleData.org_id,
      module_id: parsed.data.module_id,
      title: parsed.data.title,
      order_index: nextOrder,
    });

    if (error) {
      return { error: error.message ?? 'No se pudo crear la unidad.' };
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

  const parsed = createUnitSchema.safeParse({
    module_id: formData.get('module_id'),
    title: formData.get('title'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Datos invalidos.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: moduleData } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!moduleData) {
    return { error: 'Curso no encontrado.' };
  }

  const { data: lastUnit } = await supabase
    .from('module_units')
    .select('order_index')
    .eq('module_id', parsed.data.module_id)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastUnit?.order_index ?? 0) + 1;

  const { error } = await supabase.from('module_units').insert({
    org_id: profile.org_id,
    module_id: parsed.data.module_id,
    title: parsed.data.title,
    order_index: nextOrder,
  });

  if (error) {
    return { error: error.message ?? 'No se pudo crear la unidad.' };
  }

  revalidatePath(`/admin/courses/${parsed.data.module_id}`);
  revalidatePath(`/modules/${parsed.data.module_id}`);
  return { error: null };
}
