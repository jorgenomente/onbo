'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

type AcceptInviteResult = {
  ok: boolean;
  redirectTo?: string;
  error?: 'unauthenticated' | 'not_found' | 'email_mismatch';
};

const tokenSchema = z.string().min(1);

export async function acceptGroupLocationInvite(token: string): Promise<AcceptInviteResult> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { ok: false, error: 'not_found' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: 'unauthenticated' };
  }

  const adminClient = createServiceRoleClient();
  const normalizedEmail = user.email.toLowerCase().trim();

  const { data: locationInvite } = await adminClient
    .from('location_invites')
    .select('id, location_id, email, status, role')
    .eq('token', parsed.data)
    .eq('status', 'pending')
    .maybeSingle();

  if (locationInvite) {
    if (locationInvite.email.toLowerCase().trim() !== normalizedEmail) {
      return { ok: false, error: 'email_mismatch' };
    }

    const { data: location } = await adminClient
      .from('locations')
      .select('id, slug, group_id')
      .eq('id', locationInvite.location_id)
      .maybeSingle();

    if (!location) {
      return { ok: false, error: 'not_found' };
    }

    const { data: group } = await adminClient
      .from('groups')
      .select('id, slug')
      .eq('id', location.group_id)
      .maybeSingle();

    if (!group) {
      return { ok: false, error: 'not_found' };
    }

    await adminClient.from('group_memberships').upsert(
      {
        group_id: group.id,
        user_id: user.id,
        role: 'group_member',
        email: normalizedEmail,
      },
      { onConflict: 'group_id,user_id' },
    );

    const { error: membershipError } = await adminClient
      .from('location_memberships')
      .upsert(
        {
          location_id: locationInvite.location_id,
          user_id: user.id,
          role: locationInvite.role,
        },
        { onConflict: 'location_id,user_id' },
      );

    if (membershipError) {
      return { ok: false, error: 'not_found' };
    }

    await adminClient
      .from('location_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', locationInvite.id);

    return {
      ok: true,
      redirectTo: `/${group.slug}/${location.slug}`,
    };
  }

  const { data: groupInvite } = await adminClient
    .from('group_invites')
    .select('id, group_id, email, status, role')
    .eq('token', parsed.data)
    .eq('status', 'pending')
    .maybeSingle();

  if (!groupInvite) {
    return { ok: false, error: 'not_found' };
  }

  if (groupInvite.email.toLowerCase().trim() !== normalizedEmail) {
    return { ok: false, error: 'email_mismatch' };
  }

  const { data: group } = await adminClient
    .from('groups')
    .select('id, slug')
    .eq('id', groupInvite.group_id)
    .maybeSingle();

  if (!group) {
    return { ok: false, error: 'not_found' };
  }

  await adminClient.from('group_memberships').upsert(
    {
      group_id: groupInvite.group_id,
      user_id: user.id,
      role: groupInvite.role ?? 'group_admin',
      email: normalizedEmail,
    },
    { onConflict: 'group_id,user_id' },
  );

  await adminClient
    .from('group_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', groupInvite.id);

  return { ok: true, redirectTo: `/${group.slug}` };
}
