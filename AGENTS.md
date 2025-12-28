# AGENTS.md — Onbo Project Rules

This file defines **mandatory rules** for any AI agent (Codex, ChatGPT, etc.) working on this repository.

If a request conflicts with these rules, **these rules take priority**.

---

## 1. Project Context

Onbo is a B2B multi-tenant onboarding platform built with:

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth + RLS + Storage)
- Deployment on Vercel

Initial business model: **Done-with-you onboarding**
Future model: **Self-serve SaaS**

The platform is **multi-tenant by organization (workspace)**.

---

## 2. Core Architectural Rules (NON-NEGOTIABLE)

### Multi-tenancy
- Every domain table **must include `org_id`**
- No cross-organization access is allowed
- All reads/writes must be scoped by `org_id`

### Security
- **RLS must be enabled on every table**
- Default policy: **deny**
- Explicitly allow access per role
- Never assume frontend protection is enough

### Supabase Keys
- `SUPABASE_SERVICE_ROLE_KEY`:
  - **Server-side only**
  - Never imported or referenced in client components
- Client components may only use the **anon key**

### Data Access
- Sensitive operations must go through:
  - Server Actions **or**
  - Route Handlers
- All inputs validated with **Zod**
- Role-based access enforced server-side

---

## 3. Roles & Permissions

### Platform roles
- `platform_owner` (internal / super-admin)
  - Access via server-only routes
  - Actions must be logged in `audit_logs`

### Organization roles
- `org_admin`
- `trainer`
- `employee`

Rules:
- `org_admin` / `trainer`: manage content and assignments
- `employee`: read-only access to content + write own progress
- Role checks must exist **server-side**

---

## 4. Folder & File Conventions

### Required structure
src/
app/
lib/
supabase/
client.ts
server.ts
rbac.ts
auth.ts
validators/
server/
actions/
supabase/
migrations/


### Naming
- Server actions: `verbNoun.ts` (e.g. `createOrganization.ts`)
- Validators: `noun.schema.ts`
- Components: `PascalCase.tsx`

---

## 5. Database & Migrations

- All DB changes must be done via:
  - `supabase/migrations/*.sql`
- Never modify the DB manually in production
- Migrations must include:
  - Table creation
  - Indexes
  - RLS enablement
  - Policies

---

## 6. Done-with-you First, Self-serve Later

Initial features must:
- Support guided implementation by a platform owner
- Be reusable later for self-serve workflows
- Prefer templates, duplication and structured content

Do NOT:
- Hardcode onboarding flows
- Assume customers self-configure everything

---

## 7. Environment Variables

- Local env: `.env.local`
- Production env: Vercel Environment Variables
- Never hardcode URLs or secrets

Canonical URLs:
- Use `NEXT_PUBLIC_APP_URL` for links, redirects and emails

---

## 8. Required Output Format (for AI Agents)

When implementing a feature, always return:

1. Objective (1–2 lines)
2. Files to modify/create (with paths)
3. Code (TypeScript / SQL)
4. Security considerations (RLS, roles)
5. Verification checklist
6. Definition of Done

---

## 9. If in Doubt

- Prefer **blocking access** over opening it
- Prefer **simpler architecture**
- Prefer **explicit decisions**
- Ask only if the missing information is critical

---

## 10. Compliance

If an agent:
- Bypasses RLS
- Mixes server/client logic
- Exposes service keys
- Breaks multi-tenancy

→ the solution is **invalid** and must be rewritten.