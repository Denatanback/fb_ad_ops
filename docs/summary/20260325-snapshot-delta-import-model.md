# Feature Summary: Snapshot + Delta Interval Accumulation Model

## Problem Addressed
Previously, whenever the operations team uploaded a new Meta Ads CSV via the dashboard or API, the Analyzer and Dashboard would mistakenly add the snapshot values (e.g., all-time Spend) directly to the accumulated grand totals. If CSVs were run every 30 minutes, daily metrics artificially multiplied to extreme, incorrect proportions. 

## The Solution
We successfully migrated the core database and import pipeline from a "blind persistence" schema to a **Snapshot + Delta (Interval)** model *without* rewriting the underlying architecture or sacrificing the single-app simplicity.

### Key Changes Made:
- **Extended Persistence Model**: Added `interval_spend`, `interval_clicks`, `interval_impressions`, and `interval_results` columns onto `ImportNormalizedRow`.
- **Interval Gap Calculation**: Updated `processing.ts` (`persistParsedImport`):
  - Automatically queries the `previous_row_id` logically matching the exact same campaign + adset + ad + date.
  - Subtracts previous snapshot values from the new snapshot, locking negative values (from attribution rollbacks) cleanly to `0` via standard clamping.
- **Analytical Switch**: The Analyzer Dashboard and Execution Context now sum these specific interval values when grouped together. Derived metrics like CPC, CPA, and CTR smoothly recalculate against the corrected sums on the fly.
- **Administration Features**: Added an `Очистить данные` Server Action in Workspace Settings to safely flush testing datasets—dropping `ImportRun` via Cascades cleans everything without impacting logins, templates, or Google Drive metadata.
