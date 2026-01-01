'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

const inviteIdSchema = z.string().uuid();

type AcceptInviteResult = {
  ok: boolean;
  error?:
    | 'unauthenticated'
    | 'bad_invite_id'
    | 'not_found'
    | 'not_pending'
    | 'email_mismatch'
    | 'profile_upsert_failed'
    | 'assignment_failed'
    | 'invite_update_failed';
};

async function acceptInviteInternal(inviteId: string | null): Promise<AcceptInviteResult & { debugId: string }> {
  const debugId = crypto.randomUUID();
  const rawInviteId = inviteId;
  console.log('[acceptInvite]', debugId, 'start', { inviteId: rawInviteId });
  const user = await getCurrentUser();
  if (!user || !user.email) {
    console.log('[acceptInvite]', debugId, 'unauthenticated');
    return { ok: false, error: 'unauthenticated', debugId };
  }

  const parsedInviteId = inviteIdSchema.safeParse(rawInviteId);
  console.log('[acceptInvite]', debugId, 'user', { userId: user.id, email: user.email });
  console.log('[acceptInvite]', debugId, 'inviteId parsed', { success: parsedInviteId.success });
  if (!rawInviteId || !parsedInviteId.success) {
    return { ok: false, error: 'bad_invite_id', debugId };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: invite, error: inviteError } = await adminClient
    .from('organization_invites')
    .select(
      'id, org_id, email, status, role, auto_assign_course, course_id, interval_days_override, invited_by',
    )
    .eq('id', rawInviteId)
    .single();

  if (inviteError || !invite) {
    console.log('[acceptInvite]', debugId, 'invite lookup failed', { inviteError });
    return { ok: false, error: 'not_found', debugId };
  }

  if (invite.status !== 'pending') {
    console.log('[acceptInvite]', debugId, 'invite not pending', { status: invite.status });
    return { ok: false, error: 'not_pending', debugId };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    console.log('[acceptInvite]', debugId, 'email mismatch', { inviteEmail: invite.email });
    return { ok: false, error: 'email_mismatch', debugId };
  }

  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      user_id: user.id,
      org_id: invite.org_id,
      role: invite.role,
      email: invite.email,
      full_name: null,
    },
    { onConflict: 'user_id' },
  );
  if (profileError) {
    console.log('[acceptInvite]', debugId, 'profile upsert failed', { profileError });
    return { ok: false, error: 'profile_upsert_failed', debugId };
  }

  if (invite.auto_assign_course && invite.course_id) {
    const startDate = new Date();
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, interval_days_default')
      .eq('id', invite.course_id)
      .eq('org_id', invite.org_id)
      .single();

    if (!courseError && course) {
      const intervalDays = invite.interval_days_override ?? course.interval_days_default;
      const { data: enrollment, error: enrollmentError } = await adminClient
        .from('enrollments')
        .insert({
          org_id: invite.org_id,
          course_id: course.id,
          user_id: user.id,
          assigned_by: invite.invited_by,
          start_date: startDate.toISOString().slice(0, 10),
          interval_days: intervalDays,
          status: 'active',
        })
        .select('id')
        .single();

      const { data: courseModules } = await adminClient
        .from('course_modules')
        .select('module_id, order_index')
        .eq('course_id', course.id)
        .eq('org_id', invite.org_id)
        .order('order_index', { ascending: true });

      if (courseModules?.length && enrollment && !enrollmentError) {
        const rows = courseModules.map((module) => ({
          org_id: invite.org_id,
          enrollment_id: enrollment.id,
          module_id: module.module_id,
          order_index: module.order_index,
          due_date: addDays(startDate, module.order_index * intervalDays),
        }));

        if (rows.length > 0) {
          await adminClient.from('enrollment_modules').insert(rows);
        }
      }

      if (courseModules?.length) {
        const assignmentRows = courseModules.map((module) => ({
          org_id: invite.org_id,
          user_id: user.id,
          module_id: module.module_id,
          assigned_by: invite.invited_by,
          due_date: addDays(startDate, module.order_index * intervalDays),
          status: 'assigned',
          updated_at: new Date().toISOString(),
        }));

        const { error: assignmentError } = await adminClient
          .from('assignments')
          .upsert(assignmentRows, {
            onConflict: 'org_id,user_id,module_id',
          });

        if (assignmentError) {
          console.log('[acceptInvite]', debugId, 'assignment upsert failed', {
            assignmentError,
          });
          return { ok: false, error: 'assignment_failed', debugId };
        }
      }
    }
  }

  const { error: inviteUpdateError } = await adminClient
    .from('organization_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (inviteUpdateError) {
    console.log('[acceptInvite]', debugId, 'invite update failed', { inviteUpdateError });
    return { ok: false, error: 'invite_update_failed', debugId };
  }

  return { ok: true, debugId };
}

export async function acceptInviteWithId(inviteId: string) {
  return acceptInviteInternal(inviteId);
}

export async function acceptInvite(formData: FormData) {
  const inviteId =
    (formData.get('invite_id') as string | null) ??
    (formData.get('inviteId') as string | null);
  const result = await acceptInviteInternal(inviteId);
  if (!result.ok) {
    if (result.error === 'unauthenticated') {
      redirect('/login');
    }
    redirect(
      `/auth/accept-invite?error=${result.error}&debugId=${encodeURIComponent(result.debugId)}`,
    );
  }
  redirect('/home');
}
