'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { inviteSchema } from '@/lib/validators/invite.schema';

export type InviteEmployeeState = {
  ok: boolean;
  mode?: 'link_generated';
  invite_id?: string;
  message?: string;
  dev_link?: string;
  error?: string;
};

export async function inviteEmployee(
  _prevState: InviteEmployeeState,
  formData: FormData,
): Promise<InviteEmployeeState> {
  if (!formData) {
    return { ok: false, error: 'Datos inválidos.' };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return { ok: false, error: 'No autorizado.' };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: 'employee',
    auto_assign_course: formData.get('auto_assign_course') === 'true',
    course_id: formData.get('course_id') || null,
    interval_days: formData.get('interval_days')
      ? Number(formData.get('interval_days'))
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos.' };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { data: existingInvite } = await supabase
    .from('organization_invites')
    .select('id, send_count')
    .eq('org_id', profile.org_id)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let inviteId = existingInvite?.id ?? null;
  let sendCount = existingInvite?.send_count ?? 0;

  if (existingInvite) {
    const { error: updateError } = await supabase
      .from('organization_invites')
      .update({
        auto_assign_course: parsed.data.auto_assign_course,
        course_id: parsed.data.course_id,
        interval_days_override: parsed.data.interval_days,
      })
      .eq('id', existingInvite.id)
      .eq('org_id', profile.org_id);

    if (updateError) {
      return {
        ok: false,
        error: updateError.message ?? 'No se pudo actualizar la invitación.',
      };
    }
  } else {
    const { data: insertedInvite, error: insertError } = await supabase
      .from('organization_invites')
      .insert({
        org_id: profile.org_id,
        email: normalizedEmail,
        role: parsed.data.role,
        auto_assign_course: parsed.data.auto_assign_course,
        course_id: parsed.data.course_id,
        interval_days_override: parsed.data.interval_days,
        invited_by: profile.user_id,
        status: 'pending',
        send_count: 0,
        last_sent_at: null,
      })
      .select('id')
      .single();

    if (insertError || !insertedInvite) {
      return {
        ok: false,
        error: insertError?.message ?? 'No se pudo crear la invitación.',
      };
    }

    inviteId = insertedInvite.id;
    sendCount = 0;
  }

  const adminClient = createSupabaseAdminClient();
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  const redirectTo = `${appUrl}/auth/setup-password?inviteId=${inviteId}`;

  const inviteResponse = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo },
  );

  if (inviteResponse.error) {
    if (
      inviteResponse.error.message?.toLowerCase().includes('already been registered')
    ) {
      return {
        ok: true,
        message: 'Usuario ya existe. Pedile que inicie sesión para aceptar.',
        invite_id: inviteId ?? undefined,
      };
    }
    return {
      ok: false,
      error: inviteResponse.error.message ?? 'No se pudo enviar el email.',
    };
  }

  const invitedUserId = inviteResponse.data?.user?.id ?? null;

  if (invitedUserId) {
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        user_id: invitedUserId,
        org_id: profile.org_id,
        role: parsed.data.role,
        email: normalizedEmail,
        full_name: null,
      },
      { onConflict: 'user_id' },
    );

    if (profileError) {
      return {
        ok: false,
        error: profileError.message ?? 'No se pudo crear el perfil.',
      };
    }

    if (parsed.data.auto_assign_course && parsed.data.course_id) {
      const { data: course, error: courseError } = await adminClient
        .from('courses')
        .select('id, interval_days_default')
        .eq('id', parsed.data.course_id)
        .eq('org_id', profile.org_id)
        .single();

      if (!courseError && course) {
        const intervalDays = parsed.data.interval_days ?? course.interval_days_default;
        const startDate = new Date();
        const { data: courseModules } = await adminClient
          .from('course_modules')
          .select('module_id, order_index')
          .eq('course_id', course.id)
          .eq('org_id', profile.org_id)
          .order('order_index', { ascending: true });

        if (courseModules?.length) {
          const assignmentRows = courseModules.map((module) => ({
            org_id: profile.org_id,
            user_id: invitedUserId,
            module_id: module.module_id,
            assigned_by: profile.user_id,
            due_date: new Date(
              startDate.getTime() + module.order_index * intervalDays * 86400000,
            )
              .toISOString()
              .slice(0, 10),
            status: 'assigned',
            updated_at: new Date().toISOString(),
          }));

          await adminClient
            .from('assignments')
            .upsert(assignmentRows, { onConflict: 'org_id,user_id,module_id' });
        }
      }
    }
  }

  await supabase
    .from('organization_invites')
    .update({
      last_sent_at: new Date().toISOString(),
      send_count: sendCount + 1,
      invited_user_id: invitedUserId ?? null,
    })
    .eq('id', inviteId);

  console.log('[invite] invite sent', { invite_id: inviteId, email: normalizedEmail });

  revalidatePath('/settings/members');
  return {
    ok: true,
    mode: 'link_generated',
    message: 'Invitación enviada. El usuario debe crear su contraseña.',
    invite_id: inviteId ?? undefined,
    dev_link: undefined,
  };
}
