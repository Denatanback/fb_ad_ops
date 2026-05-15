## Changed Files

- `prisma/schema.prisma` — added import metadata fields for format/reporting window and made `sourceFileHash` unique for import idempotency.
- `prisma/migrations/202603201416_add_import_hash_idempotency/migration.sql` — added the migration for import duplicate protection metadata and unique file-hash enforcement.
- `src/server/services/import-runs.ts` — stored and selected duplicate-relevant metadata and added lookup by file hash.
- `src/server/imports/meta-ads-format.ts` — added lightweight CSV inspection for canonical format validation and reporting-window extraction before effective import.
- `src/server/imports/storage.ts` — returned UTF-8 CSV text from the upload buffer so intake can inspect duplicate metadata without another storage read.
- `src/server/imports/intake.ts` — added duplicate detection, duplicate-specific error handling, and hash/idempotency-aware import creation.
- `src/app/api/imports/upload/route.ts` — returns `409` with existing import-run info for duplicate CSV API uploads.
- `src/app/(workspace)/imports/actions.ts` — redirects manual duplicate uploads to the existing import run instead of starting a second one.
- `src/components/imports/manual-import-upload-form.tsx` — clarified manual-upload UI copy about duplicate blocking by file hash.
- `src/app/(workspace)/imports/[importRunId]/page.tsx` — added duplicate flash messaging and displays the format key plus reporting window metadata.
- `README.md` — documented duplicate protection, idempotency behavior, and the duplicate API response.
- `docs/product/analyzer.md` — documented file-hash duplicate protection in the upload/analyzer pipeline direction.
- `docs/plans/2026-03-20_1416-step-27-csv-duplicate-protection.md` — task plan for this step.
- `docs/summary/2026-03-20_1416-step-27-csv-duplicate-protection.md` — task completion summary for this step.
