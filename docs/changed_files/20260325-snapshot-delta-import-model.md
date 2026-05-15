# Changed Files: Snapshot + Delta Import Model

## Database
- `prisma/schema.prisma`
  - Extended `ImportNormalizedRow` with nullable `interval` decimal columns.
  - Added self-referencing relationship `previousRowId`.

## Import Pipeline
- `src/server/imports/processing.ts`
  - Re-wired `persistParsedImport` to pull prior rows and apply non-destructive subtracted deltas.
- `src/server/imports/storage.ts`
  - Added physical storage cleanup utility for the Reset Action.

## Application Code
- `src/server/analyzer/execution.ts`
  - Modified `normalizedRowSelect` and `aggregateMetrics` to map `intervalX ?? snapshotX`.
- `src/server/services/historical-aggregates.ts`
  - Modified dashboard metric aggregation loop to sum delta-derived interval columns.
- `src/app/(workspace)/settings/actions.ts` (NEW)
  - Registered `resetAnalyticalDataAction` Server Action handling Prisma cascades.
- `src/app/(workspace)/settings/reset-button.tsx` (NEW)
  - Interactive Client Component strictly blocking accidental `Очистить данные` execution.
- `src/app/(workspace)/settings/page.tsx`
  - Inserted the new "Danger Zone" block exposing the reset mechanism to Admins.
