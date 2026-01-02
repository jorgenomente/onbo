'use client';

import { Suspense } from 'react';

import SetupPasswordClient from './SetupPasswordClient';

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4">
          <h1 className="text-2xl font-semibold">Validando sesión…</h1>
          <p className="text-sm text-muted-foreground">
            Estamos preparando tu cuenta.
          </p>
        </div>
      }
    >
      <SetupPasswordClient />
    </Suspense>
  );
}
