'use client';

import { useEffect, useMemo, useState } from 'react';

type DebugInfo = {
  pathname: string;
  userAgent: string;
  localStorageKeys: string[];
  cookieNames: string[];
  authResetInitiatedAt: string | null;
  authResetEmail: string | null;
};

export default function DebugClient() {
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const debugInfo = useMemo<DebugInfo>(() => {
    if (!isClient) {
      return {
        pathname: '',
        userAgent: '',
        localStorageKeys: [],
        cookieNames: [],
        authResetInitiatedAt: null,
        authResetEmail: null,
      };
    }

    let localStorageKeys: string[] = [];
    let cookieNames: string[] = [];
    let authResetInitiatedAt: string | null = null;
    let authResetEmail: string | null = null;

    try {
      localStorageKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith('sb-') ||
          key.toLowerCase().includes('supabase') ||
          key.includes('verifier') ||
          key.startsWith('auth_reset_'),
      );
      authResetInitiatedAt = localStorage.getItem('auth_reset_initiated_at');
      authResetEmail = localStorage.getItem('auth_reset_email');
    } catch {
      // Ignore localStorage failures.
    }

    try {
      cookieNames = document.cookie
        .split(';')
        .map((entry) => entry.trim().split('=')[0])
        .filter(
          (name) =>
            name.startsWith('sb-') ||
            name.toLowerCase().includes('supabase'),
        );
    } catch {
      // Ignore cookie access failures.
    }

    return {
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      localStorageKeys,
      cookieNames,
      authResetInitiatedAt,
      authResetEmail,
    };
  }, [isClient]);

  async function copyInfo() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Auth Debug</h1>
        <p className="text-sm text-muted-foreground">
          Solo disponible en desarrollo.
        </p>
      </div>

      <pre className="rounded-md border bg-muted/30 p-4 text-sm">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>

      <button
        type="button"
        onClick={copyInfo}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {copied ? 'Copiado' : 'Copiar debug info'}
      </button>
    </div>
  );
}
