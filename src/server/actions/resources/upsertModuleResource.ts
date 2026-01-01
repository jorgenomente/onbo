'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpsertModuleResourceInput = {
  moduleId: string;
  title: string;
  url: string;
  resourceId?: string | null;
};

const upsertSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  url: z.string().trim().min(1),
  resourceId: z.string().uuid().optional().nullable(),
});

const VIDEO_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
]);

function inferResourceType(url: string) {
  try {
    const parsed = new URL(url);
    if (VIDEO_HOSTS.has(parsed.hostname.toLowerCase())) {
      return 'video';
    }
  } catch {
    return 'link';
  }

  if (url.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }

  return 'link';
}

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function upsertModuleResource(input: UpsertModuleResourceInput) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    throw new Error('No autorizado.');
  }

  const parsed = upsertSchema.safeParse({
    moduleId: input.moduleId,
    title: input.title,
    url: input.url,
    resourceId: input.resourceId ?? null,
  });

  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const normalizedUrl = normalizeUrl(parsed.data.url);
  const urlParse = z.string().url().safeParse(normalizedUrl);
  if (!urlParse.success) {
    throw new Error('URL invalida.');
  }

  console.log('[upsertModuleResource] called', {
    moduleId: parsed.data.moduleId,
    org_id: profile.org_id,
    role: profile.role,
  });

  const supabase = await createSupabaseServerClient();
  const { data: moduleData } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.moduleId)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!moduleData) {
    throw new Error('Curso no encontrado.');
  }

  const resourceType = inferResourceType(normalizedUrl);
  const payload = {
    org_id: profile.org_id,
    module_id: parsed.data.moduleId,
    title: parsed.data.title,
    type: resourceType,
    url: normalizedUrl,
    description: null,
    order_index: 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = parsed.data.resourceId
    ? await supabase
        .from('module_resources')
        .update(payload)
        .eq('id', parsed.data.resourceId)
        .eq('org_id', profile.org_id)
    : await supabase.from('module_resources').insert(payload);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[resources] upsert module resource', error);
    }
    throw new Error(error.message ?? 'No se pudo guardar el recurso.');
  }

  revalidatePath(`/admin/courses/${parsed.data.moduleId}/resources`);
  revalidatePath(`/modules/${parsed.data.moduleId}`);
  revalidatePath(`/modules/${parsed.data.moduleId}/resources`);
}
