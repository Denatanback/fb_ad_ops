# Summary — Step 25: Telegram Queue + Digest Reporting

## Status: Complete — TypeScript build passes clean

## What was done

### Inspection of partially-changed files
All six modified files were inspected before making any changes.

**Already solid (no functional changes needed):**
- `prisma/schema.prisma` — complete models: `AlertEvent`, `NotificationDigest`, `NotificationDelivery`, correct enums
- `src/server/notifications/digests.ts` — complete cycle logic, 30-min window math, claim-before-send, rate-limit defer
- `src/server/services/alerts.ts` — complete CRUD: upsert digest, assign events, record deliveries
- `src/server/imports/processing.ts` — clean, already reports `queuedDigestAlertsCount`

**Had issues:**
- `src/server/analyzer/execution.ts` — bad indentation in catch block (syntactically valid but messy) — **fixed**
- `prisma generate` was never run after schema changes → all new types/models unknown to client → **fixed**

### Changes made in this step

1. **`prisma generate`** — regenerated client from updated schema
2. **Schema fix** — `NotificationTopicKey` enum keys changed from uppercase (`CONVERSIONS`) to lowercase (`conversions`) to match the `TelegramTopicKey` string union used throughout the app. Also updated `@default(NEEDS_REVIEW)` → `@default(needs_review)` in `AnalyzerRuleConfig`
3. **`src/server/services/alerts.ts`** — added `notificationDigestId: true` to `alertEventSelect` so `PersistedAnalyzerArtifacts.alertEvents` type includes the field
4. **`src/server/services/analyzer-rules.ts`** — updated `topicKeyToDb` map to use new lowercase Prisma enum keys (`PrismaNotificationTopicKey.conversions` etc.)
5. **`src/server/analyzer/execution.ts`** — fixed catch block indentation (cosmetic)
6. **`src/app/api/notifications/digests/cycle/route.ts`** — new POST endpoint that authenticates via `CRON_SECRET` Bearer token and runs `runTelegramDigestQueueCycle()`
7. **Migration** `202603201621_add_telegram_digest_queue` — SQL to create `notification_dispatch_mode` and `notification_digest_status` enums, `notification_digests` table, and add `dispatch_mode`/`notification_digest_id` columns to existing tables

## Verification

- **TypeScript build**: passes clean (`npx tsc --noEmit` = no output = zero errors)
- **Digest topics**: `conversions`, `needs_review`, `strong_signals` → `DIGEST_30M`
- **Immediate topics**: `import_errors_tech`, `bot_test` → `IMMEDIATE`
- **Duplicate prevention**: `digestKey` unique constraint + `updateMany` claim-before-send
- **Rate limit handling**: `DEFERRED` status + `retryAfterUntil` field, re-queued on next cycle
- **Diagnostics**: `NotificationDelivery` rows record every attempt; `NotificationDigest` records status + provider message ID + error

## Queue/report model

```
AlertEvent (persisted, source of truth)
  └─ dispatchMode = DIGEST_30M (for conversions/needs_review/strong_signals)
  └─ notificationDigestId → NotificationDigest (assigned by enqueueAlertEventsForDigest)

NotificationDigest (one per topic per 30-min window)
  └─ digestKey = "telegram:{topic}:{windowStart.iso}"  [UNIQUE]
  └─ status: QUEUED → BUILT → SENT | FAILED | DEFERRED
  └─ windowStart, windowEnd (UTC 30-min floors)

NotificationDelivery (audit trail per send attempt)
  └─ linked to NotificationDigest
  └─ deliveryStatus: SENT | FAILED | SKIPPED
```

## How 30-minute digest generation is triggered

External cron (every 30 minutes) POSTs to:
```
POST /api/notifications/digests/cycle
Authorization: Bearer $CRON_SECRET
```

Response includes: `queuedAlertsCount`, `queuedDigestCount`, `builtCount`, `sentCount`, `failedCount`, `skippedCount`, `deferredCount`

## Remaining follow-up items

1. **Database migration must be applied** to a running Postgres instance via `prisma migrate deploy` before the new code works in production. The migration SQL is at `prisma/migrations/202603201621_add_telegram_digest_queue/migration.sql`
2. **Set `CRON_SECRET` env var** in production environment
3. **Configure external cron** (e.g., system cron, Render cron job, or GitHub Actions scheduled workflow) to POST to `/api/notifications/digests/cycle` every 30 minutes
4. **Digest observability UI** (e.g., a diagnostics page showing recent digests) is out of scope for this step but the data is now fully available via `listRecentTelegramDigests()`
