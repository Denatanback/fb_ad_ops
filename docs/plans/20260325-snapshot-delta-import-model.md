# Snapshot and Delta Import Model Plan

## 1. Current Pipeline Assessment
- The CSV import process currently parses Meta Ads CSV files into `ImportRawRow` and `ImportNormalizedRow`.
- These rows contain point-in-time cumulative snapshot totals (`spend`, `clicks`, `impressions`, `results`).
- Both the **Analyzer** (`src/server/analyzer/execution.ts`) and **Dashboard** (`src/server/services/historical-aggregates.ts`) calculate aggregate metrics by naively `sum()`ming the base metrics of all normalized rows in a given window or run.
- **The Bug:** If multiple CSVs are uploaded for the same day/reporting window, the snapshot totals are duplicated. The more CSVs uploaded, the higher the duplicate spend/clicks.

## 2. Proposed Snapshot & Delta (Interval) Model
- Keep `spend`, `clicks`, `impressions`, `results` as the raw Cumulative/Snapshot values from Meta.
- Add `intervalSpend`, `intervalClicks`, `intervalImpressions`, `intervalResults` to the `ImportNormalizedRow` model to store the True Delta since the last import.
- Add `previousRowId` to link explicitly to the prior snapshot row.
- At import time (in `src/server/imports/processing.ts`), we will query the previous `ImportRun` to find the matching row identity.
- We subtract the previous totals from the current totals to compute the Delta/Interval metrics.

## 3. Compatibility & Comparison Strategy
- A previous snapshot is considered "compatible" if it shares the exact same:
  - `reportDate`
  - `campaignName`
  - `adsetName`
  - `adName`
- We will find the most recent `ImportRun` logically prior to the current one that has the same reporting date.
- If no previous snapshot exists for a row, the delta will equal the absolute snapshot values.
- **Negative Deltas:** If Facebook retracts attribution and the snapshot total drops, a naive subtraction yields a negative delta. We will safely clamp negative deltas to `0` to prevent destructive subtraction in downstream BI aggregations. 

## 4. Metric Handling Details
- **Base Metrics:** `spend`, `clicks`, `impressions`, `results` are handled via safely clamped subtraction.
- **Derived Metrics:** Analytics consumers (Analyzer & Dashboard) will be updated to sum `intervalX` instead of `X`. Ratios like CPC, CTR, CPM, and CPA are recalculated on the fly from the summed `intervalX` values, correctly satisfying the "Derived/rate/cost metrics are NOT additive" requirement.
- **Additional Metrics:** `outboundCtr` and `cplpv` will continue to be averaged from snapshots since their underlying base counts (`outbound clicks` and `landing page views`) are not explicitly parsed and normalized in the schema natively, avoiding excessive schema engineering.

## 5. Reset Scope ("Очистить данные")
- Reset will truncate all imported analytical data to allow operators to wipe slate cleanly without affecting standard configuration.
- We will rely on Prisma Cascade deletion: deleting `ImportRun` cascades to `ImportNormalizedRow`, `ImportRawRow`, `AnalyzerComparisonGroup`, `AnalyzerResult`, `AlertEvent`, and `NotificationDelivery`.
- This ensures Users, Core Settings, Notifications Settings, and Creative Libraries are fully preserved.
- We will construct an admin Server Action and UI button (with Russian warnings) under `/admin/settings` (or an equivalent sensible protected route) to perform this `db.importRun.deleteMany({})` clear.

## 6. Non-Goals
- We are NOT building a full Event Sourcing architecture or heavy data warehouse ETL.
- We are NOT storing delta changes as standalone separate rows. The deltas live directly on the normalized snapshot row for max simplicity in the current operational app.
- We are NOT retroactively recalculating historical intervals if a mid-day CSV is deleted or modified. The pipeline assumes append-only linear upload history.
