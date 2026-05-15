## Changed Files

- `docs/plans/2026-03-20_1222-step-24-meta-csv-canonical-format.md` - added the implementation plan for replacing the canonical import schema.
- `src/server/imports/meta-ads-format.ts` - replaced the old `Day`-based parser contract with the real Meta ad-level export schema, updated normalization, improved error messages, and kept analyzer-facing metrics honest.
- `src/app/(workspace)/imports/page.tsx` - updated the manual import UI copy to reference the new canonical CSV format key.
- `docs/product/analyzer.md` - documented the new canonical import schema, normalized metric semantics, and `Reporting starts` / `Reporting ends` handling.
- `README.md` - updated operational import docs, sample upload instructions, and analyzer notes to reflect the new Meta export format.
- `docs/dev/fixtures/meta_ads_ad_level_export_v1.sample.csv` - added a new canonical sample fixture matching the real Meta export shape.
- `docs/dev/fixtures/meta_ads_daily_ad_report_v1.sample.csv` - removed the old sample fixture that no longer represents the primary supported import format.
- `docs/summary/2026-03-20_1222-step-24-meta-csv-canonical-format.md` - added the task completion summary.
