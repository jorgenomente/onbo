'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const revokeInviteSchema = z.object({
  invite_id: z.string().uuid(),
  delete_auth_user: z.boolean().optional(),
});

export async function revokeInvite(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (!isAdminLike(profile.role)) {
    return;
  }

  const parsed = revokeInviteSchema.safeParse({
    invite_id: formData.get('invite_id'),
    delete_auth_user: formData.get('delete_auth_user') === 'true',
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from('organization_invites')
    .select('id, invited_user_id')
    .eq('id', parsed.data.invite_id)
    .eq('org_id', profile.org_id)
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return;
  }

  await supabase
    .from('organization_invites')
    .update({ status: 'revoked' })
    .eq('id', invite.id);

  if (parsed.data.delete_auth_user && invite.invited_user_id) {
    const adminClient = createSupabaseAdminClient();
    await adminClient.auth.admin.deleteUser(invite.invited_user_id);
  }

  revalidatePath('/settings/members');
}
