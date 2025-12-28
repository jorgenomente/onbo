import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user: data?.user ? { id: data.user.id, email: data.user.email } : null,
    error: error?.message ?? null,
  });
}
