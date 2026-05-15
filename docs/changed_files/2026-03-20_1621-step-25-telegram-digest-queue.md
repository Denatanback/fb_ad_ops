# Changed Files — Step 25: Telegram Queue + Digest Reporting

## Modified files

### `prisma/schema.prisma`
- Changed `NotificationTopicKey` enum keys from uppercase (`CONVERSIONS`, `NEEDS_REVIEW`, etc.) to lowercase (`conversions`, `needs_review`, etc.) to match `TelegramTopicKey` string union
- Updated `AnalyzerRuleConfig.destinationTopicKey @default(NEEDS_REVIEW)` → `@default(needs_review)`

### `src/server/services/alerts.ts`
- Added `notificationDigestId: true` to `alertEventSelect` constant

### `src/server/services/analyzer-rules.ts`
- Updated `topicKeyToDb` mapper to use lowercase Prisma enum keys (`PrismaNotificationTopicKey.conversions` etc.)

### `src/server/analyzer/execution.ts`
- Fixed indentation in catch block of `deliverAlertNotifications()` (cosmetic)

## New files

### `src/app/api/notifications/digests/cycle/route.ts`
- POST endpoint for triggering `runTelegramDigestQueueCycle()`
- Protected by `CRON_SECRET` env var (Bearer token or `x-cron-secret` header)
- Returns digest cycle result JSON

### `prisma/migrations/202603201621_add_telegram_digest_queue/migration.sql`
- Creates `notification_dispatch_mode` enum
- Creates `notification_digest_status` enum
- Creates `notification_digests` table with full digest state tracking
- Adds `dispatch_mode` and `notification_digest_id` columns to `alert_events`
- Adds `notification_digest_id` column to `notification_deliveries`
- Adds indexes and FK constraints

## Files confirmed correct (no changes needed)

- `src/server/notifications/digests.ts` — complete digest cycle logic
- `src/server/notifications/telegram.ts` — clean Telegram sender, unchanged
- `src/server/services/alerts.ts` (beyond alertEventSelect) — complete CRUD
- `src/server/imports/processing.ts` — clean, already includes digest stats

## Env vars required

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Authenticates POST /api/notifications/digests/cycle |
| `TELEGRAM_BOT_TOKEN` | Existing — Telegram bot token |
| `TELEGRAM_CHAT_ID` | Existing — Telegram chat/group ID |
| `TELEGRAM_ALERTS_ENABLED` | Existing — feature flag |
| `TELEGRAM_TOPIC_CONVERSIONS_ID` | Existing — thread ID |
| `TELEGRAM_TOPIC_NEEDS_REVIEW_ID` | Existing — thread ID |
| `TELEGRAM_TOPIC_STRONG_SIGNALS_ID` | Existing — thread ID |
| `TELEGRAM_TOPIC_IMPORT_ERRORS_TECH_ID` | Existing — thread ID |
