# Runtime Validation And Telegram Digest Check

## Scope

- Validate the recovered single-service root/runtime setup for the existing FB Ads Ops web service
- Audit the Telegram digest pipeline from `AlertEvent` creation to digest grouping, delivery, and operator-visible diagnostics
- Apply only targeted fixes required for runtime correctness or digest transparency
- Add only minimal diagnostics that help local/operator verification

## Assumptions

- `src/**`, `prisma/**`, historical aggregates, target cost config, duplicate import protection, dashboard, and creatives gallery are the intended product baseline and should stay intact
- Telegram digest delivery remains the intended model for `conversions`, `needs_review`, and `strong_signals`
- `import_errors_tech` and `bot_test` may remain immediate
- Local verification may still be partially constrained by DB / Docker / live Telegram env availability

## Exact Validation Targets

1. Root runtime/bootstrap consistency
   - `package.json` scripts
   - `.env.example`
   - `Dockerfile`
   - `docker-compose.yml`
   - auth/admin seed expectations
2. Prisma runtime consistency
   - schema vs digest-related migrations
   - generated Prisma client expectations
3. Digest source-of-truth flow
   - `AlertEvent` creation
   - dispatch mode resolution
   - `NotificationDigest` upsert / window grouping
   - `NotificationDelivery` write paths
   - Telegram topic routing and skip/failure conditions
4. Operator diagnostics
   - import run diagnostics visibility
   - whether digest-based alerts are represented honestly in runtime diagnostics
   - whether admin surfaces expose enough digest state for manual verification

## Non-Goals

- No analyzer redesign
- No dashboard or broad UI pass
- No import format changes
- No architecture rewrite for scheduling/queueing
- No unrelated refactors in app/domain code
