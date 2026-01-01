'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const assignSchema = z.object({
  locationId: z.string().uuid(),
  moduleId: z.string().uuid(),
  userId: z.string().uuid(),
  dueDate: z.string().optional().nullable(),
});

export async function assignCourseToMember(input: {
  locationId: string;
  moduleId: string;
  userId: string;
  dueDate?: string | null;
  revalidatePathname?: string;
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
    .select('id')
    .eq('id', parsed.data.locationId)
    .maybeSingle();

  if (!location) {
    throw new Error('Local no encontrado o sin acceso.');
  }

  const { data: moduleRow } = await supabase
    .from('modules')
    .select('id')
    .eq('id', parsed.data.moduleId)
    .eq('location_id', parsed.data.locationId)
    .maybeSingle();

  if (!moduleRow) {
    throw new Error('Curso no encontrado para este local.');
  }

  const { data: memberRow } = await supabase
    .from('location_memberships')
    .select('user_id')
    .eq('location_id', parsed.data.locationId)
    .eq('user_id', parsed.data.userId)
    .maybeSingle();

  if (!memberRow) {
    throw new Error('El usuario no pertenece a este local.');
  }

  const { error } = await supabase
    .from('course_assignments')
    .upsert(
      {
        location_id: parsed.data.locationId,
        module_id: parsed.data.moduleId,
        user_id: parsed.data.userId,
        due_date: parsed.data.dueDate || null,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'location_id,module_id,user_id' },
    );

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[assignments] assign course', error);
    }
    throw new Error(error.message ?? 'No se pudo asignar el curso.');
  }

  if (input.revalidatePathname) {
    revalidatePath(input.revalidatePathname);
  }
}
