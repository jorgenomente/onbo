import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  const { data: profile, error: profileErr } = user
    ? await supabase
        .from('profiles')
        .select('user_id, org_id, role, full_name, created_at')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null, error: null };

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    userErr: userErr?.message ?? null,
    profile,
    profileErr: profileErr?.message ?? null,
  });
}
