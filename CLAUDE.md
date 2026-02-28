# Inventory Management System

Laboratory reagent and lot inventory management for Anamed.

## Stack

- **Next.js App Router** (JavaScript, NOT TypeScript)
- **Supabase** — auth, PostgreSQL, Storage, Edge Functions
- **DaisyUI + Tailwind CSS** — UI components
- **@headlessui/react** — accessible modals/dialogs
- **react-hot-toast** — notifications
- **react-hook-form + Zod** — form state and validation
- **Vitest + React Testing Library** — tests

## Project Structure

```
actions/          Server actions (withAuth wrapper, no API routes)
app/              Next.js pages and API routes
  api/export/     Export API routes (request + status polling)
  api/alerts/     Alert digest cron endpoint (Vercel Cron)
components/       React components
  inventory/      LotsPanel, ReagentTable, ExportModal, Pagination, …
  analytics/      Dashboard charts and audit log
  admin/          User management
libs/             Shared utilities
  schemas.js      All Zod schemas (FE + BE share the same file)
  constants.js    UNITS, CATEGORIES, MOVEMENT_TYPES, helpers
  auth.js         withAuth() wrapper for server actions
  utils.js        getErrorMessage()
  email-templates.js  Alert digest email builders (HTML + plain text)
  resend.js       Resend email client (sendEmail)
  queries.js      Shared DB query helpers (no "use server" — safe to import from API routes)
supabase/
  migrations/     SQL migrations (run in order, 00001–00012)
  functions/      Edge Functions (Deno 2 runtime)
    process-export/   Background Excel generation
    _shared/          Edge Function internal library (supabase.ts, excel.ts)
                      — Next.js app does NOT import from here
  seed.sql        Local dev seed data
  config.toml     Local Supabase config (includes exports storage bucket)
tests/            Vitest suites: unit, integration, actions, components
```

## Key Conventions

- **Zod schemas** in `libs/schemas.js` — shared between FE and BE
  - FE: `schema.safeParse(data)` before submit, toast first error
  - BE: `validateWithSchema(schema, data)` at top of server actions
- **Routes**: All route paths must come from `config.routes` in `config.js` — never hardcode path strings in components, middleware, or server code
- **Server actions** use `withAuth()` from `libs/auth.js` — also checks `profiles.is_active`
- **API routes** use `createSupabaseClient()` directly (no `withAuth`)
- **Error handling** via `getErrorMessage()` from `libs/utils.js`
- **Optional strings → null**: Zod `.transform(v => v || null)` for nullable DB columns
- **Categories**: `reagent`, `control`, `calibrator`, `consumable`, `solution`
- `lots.expiry_date` is nullable — consumables don't expire; sort null last
- `internal_barcode` was renamed to `reference` in migration 00005
- **User deactivation (soft-delete)**: Users are never hard-deleted. `revokeUser()` bans the auth user + calls `deactivate_user_tx` RPC (atomic transaction for profile update, export job cancellation, audit log). `reactivateUser()` reverses it via `reactivate_user_tx` RPC. If the DB transaction fails after the Auth ban/unban, a compensating rollback restores the Auth state. The `is_active` check is enforced at 4 layers: Supabase Auth ban, middleware, `withAuth()`, and RLS policies.
- **Multi-step operations with Auth + DB**: When an operation involves both a GoTrue API call (ban/unban) and multiple DB writes, use the pattern: (1) Auth call first, (2) atomic RPC for all DB operations, (3) compensating Auth rollback if the RPC fails. See `revokeUser`/`reactivateUser` in `actions/admin.js` and RPC functions in migration 00012.

## Environments

| Env        | Supabase Ref          | Site URL                          |
|------------|-----------------------|-----------------------------------|
| Local      | localhost:54321       | http://localhost:3001             |
| Staging    | xpejogsvvskpmvvfievz  | http://staging.testing-anthony.xyz |
| Production | yzrbgdymgwlzrfhtmxyv  | https://testing-anthony.xyz       |

## Deployment (fully automated — no manual steps)

### Deploy everything (migrations + Edge Functions)

```bash
npm run supabase:deploy:staging   # staging
npm run supabase:deploy:prod      # production
```

### Individual commands

```bash
npm run db:push:staging              # push pending migrations to staging
npm run db:push:prod                 # push pending migrations to production
npm run functions:deploy:staging     # deploy Edge Functions to staging
npm run functions:deploy:prod        # deploy Edge Functions to production
```

### What gets deployed automatically

- **DB migrations**: `supabase/migrations/` — applied in order
- **Storage bucket** (`exports`): created by migration 00007 on remote; defined in `config.toml` for local
- **Edge Functions**: `supabase/functions/process-export/`

## Local Development

```bash
supabase start                  # start local Supabase (DB, Auth, Storage, Edge Runtime)
supabase db reset               # apply all migrations + seed data (first-time setup)
npm run supabase:local          # apply pending migrations + serve Edge Functions (hot reload)
npm run dev                     # Next.js dev server (http://localhost:3001)
```

`npm run supabase:local` is the everyday command after `supabase start` is already running.
It applies any pending migrations first, then starts the Edge Function server.

The `exports` storage bucket is created automatically when `supabase start` runs (defined in `config.toml`).

## Testing

```bash
npm test                        # all tests (Vitest watch mode)
npm run test:run                # all tests (CI mode, no watch)
npm run test:unit               # unit tests (node environment)
npm run test:integration        # integration tests (requires local Supabase)
npm run test:actions            # server action tests (requires local Supabase)
npm run test:components         # component tests (jsdom)
```

## Edge Functions

- Located in `supabase/functions/<name>/index.ts`
- Shared utilities in `supabase/functions/_shared/` — the Edge Function's own internal library, not shared with the Next.js app
- **Deno 2 runtime** — import Node packages with npm specifier: `import X from 'npm:exceljs'`
- Auto-available env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- No manual secret configuration needed for Supabase built-ins

### process-export function

Invoked by `POST /api/export/request` (fire-and-forget). Updates the `export_jobs` record in the DB as it progresses (`pending → processing → completed/failed`). Fetches all data in 1000-row batches to handle PostgREST's row limit, generates Excel with ExcelJS via `_shared/excel.ts`, uploads to the `exports` Storage bucket.

## Export Architecture

```
[Export button] → ExportModal (options: include empty/expired lots)
  → POST /api/export/request → creates export_jobs row → invokes process-export Edge Function
  → polls GET /api/export/status/:jobId every 3s
  → on completed: signed Storage URL → auto-download → toast
```

Storage path pattern: `exports/{user_id}/{job_id}/inventory-export-{YYYY-MM-DD}.xlsx`
Signed URLs expire after 1 hour.

## Email Alert Architecture

Daily digest emails sent to users with `profiles.receive_email_alerts = true` AND `profiles.is_active = true`.

```
Vercel Cron (07:00 UTC daily, vercel.json)
  → GET /api/alerts/send-digest (auth: CRON_SECRET bearer token)
  → fetchLowStockReagents() + fetchExpiringLots() from actions/inventory.js
  → buildAlertDigestHtml/Text() from libs/email-templates.js
  → sendEmail() via Resend for each subscriber
  → Records result in alert_notifications table (dedup: 1 email/user/day)
```

- **Admin toggle**: `updateEmailAlertPreference()` in `actions/admin.js` — controls `profiles.receive_email_alerts`
- **Alert queries**: `fetchLowStockReagents(supabase)` and `fetchExpiringLots(supabase)` live in `libs/queries.js` (no `"use server"` — not exposed as server actions). Imported by both `actions/inventory.js` (via `withAuth`) and the API route (via service-role client)
- **`alert_notifications` table**: tracks sent/failed digests with JSONB summary. RLS: admins read all, users read own, service role inserts
- **`CRON_SECRET`**: Self generated SSL secret with `openssl rand -base64 32`

### Local testing

```bash
curl -X GET http://localhost:3001/api/alerts/send-digest \
  -H "Authorization: Bearer local-dev-secret"
```

## Gotchas

- **PostgREST row limit**: `max_rows = 1000` in `config.toml`. Use batched `.range()` loops for full-table queries (see `fetchAllReagents`/`fetchAllLots` in the Edge Function).
- **`stockOut` signature**: `(lotId, quantity, opts)` — 3 args, not an object
- **`login` action**: uses `FormData`, not a plain object
- **`requestPasswordReset`**: returns `success: true` even on errors (security — don't reveal whether email exists)
- **RLS silent failures**: Supabase returns success (no error) for policy-denied UPDATE/DELETE — verify data unchanged rather than checking error
- **Edge Function cannot import from Next.js**: logic shared between the two runtimes must be duplicated in `_shared/`
- **Never hard-delete users**: Use `revokeUser()` (soft-delete) — hard-deleting a user with activity history will fail with FK constraint violations on `audit_logs`, `stock_movements`, and `export_jobs`

## Post-Task Checklist

- **Always update `CLAUDE.md`** after completing a task that changes architecture, conventions, DB schema, or key behaviors
