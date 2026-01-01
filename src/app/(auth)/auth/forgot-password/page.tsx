'use client';

import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá tu email para recibir un enlace de recuperación.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
