# Summary

- Added a protected CSV upload route for the external server-to-server script at `POST /api/imports/upload`.
- Added local server-side file storage for uploaded CSV files and documented the MVP storage behavior.
- Added automatic import kickoff foundation that moves a new import run into `parsing` readiness and records kickoff failures cleanly.
- Added a lightweight authenticated `/imports` page for recent import-run visibility inside the workspace.

## Verification
- `INTERNAL_IMPORT_API_KEY=local-import-test-key DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fb_ads_ops?schema=public AUTH_SECRET=dev-secret-value APP_BASE_URL=http://localhost:3000 npm.cmd run build`
- Dev-server smoke test log confirmed:
  - `POST /api/imports/upload` without API key returned `401`
  - `POST /api/imports/upload` with API key but without a file returned `400`
- Verified the build output includes `/api/imports/upload` and `/imports`.

## Not verified
- A real CSV upload that writes a file, creates an `ImportRun`, and completes kickoff against a live database was not run in this step.
- CSV parsing, row normalization, analyzer execution, alerts, and Telegram delivery remain intentionally unimplemented.
- Build still emits existing Prisma datasource/runtime warnings during static generation because the repo is currently using the previously established `--no-engine` Prisma client fallback.
