import { createSupabaseServerClient } from '@/lib/supabase/server';

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function OnboDebugPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawAllowlist = process.env.ONBO_SUPERADMIN_EMAILS;
  const allowlist = parseAllowlist(rawAllowlist);
  const email = user?.email ?? null;
  const isSuperAdmin = email
    ? allowlist.includes(email.toLowerCase())
    : false;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Onbo Debug</h1>
      <div className="rounded-lg border p-4 text-sm">
        <div className="space-y-2">
          <div>
            <span className="font-semibold">User email:</span>{' '}
            {email ?? 'NO SESSION'}
          </div>
          <div>
            <span className="font-semibold">ONBO_SUPERADMIN_EMAILS:</span>{' '}
            {rawAllowlist ?? 'undefined'}
          </div>
          <div>
            <span className="font-semibold">Allowlist:</span>{' '}
            {allowlist.length ? allowlist.join(', ') : '[]'}
          </div>
          <div>
            <span className="font-semibold">isSuperAdmin:</span>{' '}
            {isSuperAdmin ? 'true' : 'false'}
          </div>
        </div>
      </div>
    </div>
  );
}
