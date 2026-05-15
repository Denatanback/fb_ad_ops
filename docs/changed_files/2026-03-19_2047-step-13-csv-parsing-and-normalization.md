## Changed Files

- `docs/plans/2026-03-19_2047-step-13-csv-parsing-and-normalization.md` - task plan created before implementation.
- `docs/summary/2026-03-19_2047-step-13-csv-parsing-and-normalization.md` - task completion summary.
- `src/server/imports/csv.ts` - added a dependency-free CSV parser for the supported import format.
- `src/server/imports/meta-ads-format.ts` - defined the supported Meta Ads CSV shape, required columns, row normalization, and naming-token preparation.
- `src/server/imports/processing.ts` - expanded kickoff into actual parse/normalize processing with raw-row persistence, normalized-row persistence, and import status summaries.
- `src/server/services/import-runs.ts` - added richer import summary/detail queries and improved processing timestamp updates.
- `src/app/api/imports/upload/route.ts` - returned updated import summaries after processing and tightened multipart upload validation.
- `src/app/(workspace)/imports/page.tsx` - refreshed the imports workspace page with clearer Russian copy, supported-format guidance, and detail links.
- `src/app/(workspace)/imports/[importRunId]/page.tsx` - added a lightweight authenticated import detail page with counts, issues, and normalized-row preview.
- `src/app/globals.css` - added shared styling for the new import detail metadata grid.
- `docs/product/analyzer.md` - documented the currently supported CSV format and what the parsing foundation now does.
- `README.md` - documented the supported CSV format, current import behavior, and the new import detail view.
