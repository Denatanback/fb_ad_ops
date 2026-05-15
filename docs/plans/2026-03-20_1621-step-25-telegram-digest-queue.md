# Step 25 — Telegram Queue + Digest Reporting

**Date:** 2026-03-20
**Scope:** Salvage and complete partially-implemented Telegram digest queue system

## Problem

The previous agent partially implemented a Telegram digest queue system but stopped without:
- Running `prisma generate` after schema changes (TypeScript compilation broken)
- Creating the API route to trigger the digest cycle
- Fixing the `NotificationTopicKey` enum key casing mismatch (uppercase Prisma vs lowercase app)
- Writing a database migration for the new models

## Design

### Alert dispatch modes
- `import_errors_tech` → **immediate** (operational safety, rare, needs instant visibility)
- `bot_test` → **immediate** (by default, if destination not in digest set)
- `conversions`, `needs_review`, `strong_signals` → **digest (30m windows)**

### Digest lifecycle
1. Analyzer produces `AlertEvent` records with `dispatchMode = DIGEST_30M`
2. `enqueueAlertEventsForDigest()` assigns each unassigned alert to a `NotificationDigest` keyed by `telegram:{topic}:{windowStart.toISOString()}`
3. Digest `digestKey` is unique — no duplicate creation (upsert)
4. `runTelegramDigestQueueCycle()` finds digests where `windowEnd <= now` and `sentAt IS NULL`
5. Each digest is claimed atomically with `updateMany` (race-safe)
6. Message is built, sent to correct Telegram topic, result recorded in `NotificationDelivery`
7. Rate-limit responses set `retryAfterUntil` and put digest in `DEFERRED` status

### Trigger mechanism
A cron-callable POST endpoint at `/api/notifications/digests/cycle` protected by `CRON_SECRET`.
The operator sets up an external cron (e.g., every 30 minutes) to POST to this endpoint.

## Implementation decisions
- `NotificationTopicKey` Prisma enum keys changed to lowercase to match `TelegramTopicKey` string union — avoids all mapper boilerplate
- `alertEventSelect` in `alerts.ts` extended with `notificationDigestId` so the type flows through `PersistedAnalyzerArtifacts`
- Digest window floor: `Math.floor(minutes / 30) * 30` in UTC
- Claim-before-send using `updateMany` with strict status + sentAt conditions
