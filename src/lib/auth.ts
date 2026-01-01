import { createSupabaseServerClient } from './supabase/server';

export type Profile = {
  user_id: string;
  org_id: string | null;
  role: 'platform_owner' | 'org_admin' | 'trainer' | 'employee';
  full_name: string | null;
  created_at: string;
};

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[getCurrentUser] auth.getUser error', error);
    }
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[getCurrentUser] user', {
      id: data.user?.id ?? null,
      email: data.user?.email ?? null,
    });
  }

  return data.user ?? null;
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[getCurrentProfile] auth.getUser error', userError);
    }
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[getCurrentProfile] user', {
      id: userData.user.id,
      email: userData.user.email,
    });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, org_id, role, full_name, created_at')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[getCurrentProfile] profiles query error', error);
    }
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[getCurrentProfile] profile', data);
  }

  return data as Profile | null;
}
