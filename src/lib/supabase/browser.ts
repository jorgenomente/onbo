import { createBrowserClient } from '@supabase/ssr';

type CookieDescriptor = {
  name: string;
  value: string;
};

function parseCookieString(cookieString: string): CookieDescriptor[] {
  if (!cookieString) {
    return [];
  }

  return cookieString
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) {
        return { name: cookie, value: '' };
      }
      const name = cookie.slice(0, separatorIndex);
      const value = cookie.slice(separatorIndex + 1);
      return { name, value };
    });
}

function formatSameSite(value?: string) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'lax') return 'Lax';
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'none') return 'None';
  return undefined;
}

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for browser client.');
  }

  const isBrowser = typeof document !== 'undefined';

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: createBrowserCookieHandlers(),
  });
}

export function createBrowserCookieHandlers() {
  const isBrowser = typeof document !== 'undefined';

  return {
    getAll() {
      if (!isBrowser) {
        return [];
      }

      return parseCookieString(document.cookie).map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
      if (!isBrowser) {
        return;
      }

      cookiesToSet.forEach(({ name, value, options }) => {
        const parts = [`${name}=${value}`];
        const sameSite = formatSameSite(options?.sameSite);

        if (options?.maxAge !== undefined) {
          parts.push(`Max-Age=${options.maxAge}`);
        }
        if (options?.expires) {
          const expiresValue =
            options.expires instanceof Date
              ? options.expires.toUTCString()
              : options.expires;
          parts.push(`Expires=${expiresValue}`);
        }
        if (options?.domain) {
          parts.push(`Domain=${options.domain}`);
        }
        parts.push(`Path=${options?.path ?? '/'}`);
        if (sameSite) {
          parts.push(`SameSite=${sameSite}`);
        }
        const secure = options?.secure ?? process.env.NODE_ENV === 'production';
        if (secure) {
          parts.push('Secure');
        }

        document.cookie = parts.join('; ');
      });
    },
  };
}
