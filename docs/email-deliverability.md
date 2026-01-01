# Email Deliverability (Supabase Auth)

## Why invites land in spam
By default, Supabase sends emails from its shared domain. Without SPF/DKIM/DMARC
aligned to your own domain, many providers (Gmail, Outlook) flag the emails as
low trust and push them to spam.

## Recommended fix (MVP-safe)
Use an external SMTP provider and configure it in Supabase:

Providers commonly used:
- Resend
- SendGrid
- Mailgun

Supabase path:
Supabase Dashboard -> Auth -> SMTP

## Expected environment variables (no values here)
These are for your SMTP provider credentials and sender identity:

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_SENDER

## Notes
- Keep using `inviteUserByEmail` from Supabase Auth.
- Set `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) so invite redirects are stable.
