# Runtime Validation And Telegram Digest Check Summary

## What Was Checked

- Root runtime/bootstrap consistency:
  - `package.json` scripts
  - `.env.example`
  - `Dockerfile`
  - `docker-compose.yml`
  - auth seed expectations in `prisma/seed.cjs`
- Prisma consistency:
  - `prisma/schema.prisma`
  - digest-related migration `prisma/migrations/202603201621_add_telegram_digest_queue/migration.sql`
  - generated Prisma client
- Digest pipeline path:
  - `AlertEvent` creation in `src/server/analyzer/execution.ts`
  - digest queue/window logic in `src/server/notifications/digests.ts`
  - `NotificationDigest` / `NotificationDelivery` persistence in `src/server/services/alerts.ts`
  - Telegram routing/config handling in `src/server/notifications/telegram.ts` and `src/server/notifications/telegram-routing.ts`
  - operator visibility on import/admin pages

## What Was Broken

1. Digest-based alerts were persisted correctly, but import-run diagnostics were still mostly delivery-record-centric.
   - This made digest-backed alerts look under-delivered or opaque on import detail pages.
   - `NotificationDigest` state was not surfaced clearly enough for an operator to understand what was queued, sent, failed, or deferred.
2. The dev `docker-compose.yml` flow had a practical startup risk:
   - the repo bind mount plus a named `/app/node_modules` volume could hide installed dependencies
   - the startup command did not repopulate dependencies into that volume
3. `typecheck` initially failed because `.next/types` was stale/missing before a fresh build regenerated the expected files.
   - This was a generated-state issue, not a new code regression.

## What Was Fixed

- Extended import-run diagnostics in `src/server/services/import-runs.ts` so they now account for digest-backed delivery truth, not only direct `NotificationDelivery` rows.
- Added digest diagnostics visibility on `src/app/(workspace)/imports/[importRunId]/page.tsx`:
  - digest-linked alert counts
  - digest-sent coverage counts
  - recent digest windows with status/topic/window/error visibility
- Added recent digest queue visibility on `src/app/(workspace)/admin/notifications/page.tsx` so admins can inspect the latest digest windows without digging through the DB.
- Hardened the dev Docker startup command in `docker-compose.yml` so the app container bootstraps dependencies into the mounted `node_modules` volume before running Prisma generation and `next dev`.

## What Still Requires Manual Verification

- Real Telegram digest sending was not live-tested in this environment.
- The cron-style digest cycle endpoint was not called against a running local app in this step.
- No real CSV import + 30-minute digest window cycle was executed end-to-end against a live local PostgreSQL instance here.

## Exact Local Run Steps

1. Ensure `.env` contains working local values for:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `APP_BASE_URL`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
   - `INTERNAL_IMPORT_API_KEY`
   - `CRON_SECRET`
   - Telegram vars if real delivery verification is needed
2. Prepare the DB:

```bash
npm run prisma:generate
npm run prisma:validate
npx prisma migrate deploy
npm run prisma:seed
```

3. Start the app:

```bash
npm run dev
```

4. Sign in with the seeded admin account.
5. Upload a real Meta CSV through `/imports`.
6. Open the created import run detail page and verify:
   - analyzer results exist
   - alert events exist
   - the new `Digest queue diagnostics` section shows queued digest windows for digest-based topics
7. Trigger the digest cycle manually:

```bash
curl -X POST http://localhost:3000/api/notifications/digests/cycle ^
  -H "Authorization: Bearer <CRON_SECRET>"
```

8. Re-open:
   - `/imports/<importRunId>`
   - `/admin/notifications`

   Verify:
   - digest status moves from `queued` / `built` to `sent` or `deferred` / `failed`
   - the expected topic window appears
   - `errorMessage`, `threadId`, and delivery state look coherent
9. If Telegram envs are configured, run one admin test send from `/admin/notifications` to verify base bot/topic routing separately from digest flow.

## Verification Run In This Step

- `npm.cmd run prisma:generate` — passed
- `npm.cmd run prisma:validate` — passed with a placeholder local `DATABASE_URL`
- `npm.cmd run build` — passed
- `npm.cmd run typecheck` — passed after a fresh `next build` regenerated `.next/types`
- `docker compose config` — passed, and confirmed the dev app command now bootstraps dependencies before starting
