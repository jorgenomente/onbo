'use server';

import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

function getSuperAdminEmails() {
  const raw = process.env.ONBO_SUPERADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    notFound();
  }

  const allowlist = getSuperAdminEmails();
  if (!allowlist.length) {
    notFound();
  }

  if (!allowlist.includes(user.email.toLowerCase())) {
    notFound();
  }

  return { user, email: user.email };
}
