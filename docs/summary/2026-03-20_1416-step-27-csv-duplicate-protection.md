## Completion Summary

- Added file-hash-based duplicate protection so identical CSV uploads are blocked before a second effective import run can be created.
- Extended import metadata with `sourceFormatKey`, `reportingWindowStart`, and `reportingWindowEnd`, then exposed that metadata in the import detail UI.
- Added operator-facing duplicate results for both manual uploads and API uploads: the app now reuses the existing import run instead of rerunning parsing, analyzer execution, alerts, or Telegram delivery.

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:validate`
- `npm.cmd run build` with local env overrides for `DATABASE_URL`, `AUTH_SECRET`, `APP_BASE_URL`, and `INTERNAL_IMPORT_API_KEY`
- Build completed successfully and the import upload route plus imports pages still compiled.
- The existing Prisma authentication warnings during static generation remained present because the local PostgreSQL credentials in this environment are not valid; they were not introduced by this duplicate-protection step.

## Notes

- The current implementation blocks duplicate uploads without creating a second import run.
- Live duplicate-upload verification against a real PostgreSQL database and a previously imported file was not run in this step.
