import { Suspense } from 'react';

import AuthCallbackClient from './auth-callback-client';

function CallbackFallback() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Validando sesión…</h1>
      <p className="text-sm text-muted-foreground">
        Estamos preparando tu acceso.
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
