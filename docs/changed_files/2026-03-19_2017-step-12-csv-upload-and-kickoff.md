# Changed Files

- `.gitignore` - ignored local MVP upload storage under `var/uploads/`.
- `.env.example` - added `INTERNAL_IMPORT_API_KEY` and `IMPORT_UPLOADS_DIR` placeholders.
- `README.md` - documented the CSV upload endpoint, auth mechanism, local storage behavior, kickoff behavior, and recent imports page.
- `docs/product/analyzer.md` - documented the upload and kickoff foundation within the analyzer pipeline direction.
- `docs/dev/tech-foundation.md` - documented import upload auth and local uploads directory env variables.
- `src/server/services/import-runs.ts` - expanded import-run selects and added recent import listing support.
- `src/server/imports/auth.ts` - added server-to-server API key auth for the upload route.
- `src/server/imports/storage.ts` - added local CSV file storage helpers, hashing, and path resolution.
- `src/server/imports/processing.ts` - added automatic kickoff foundation that marks import runs as `parsing` or `failed`.
- `src/app/api/imports/upload/route.ts` - added the protected CSV upload entry point with ImportRun creation and kickoff.
- `src/app/(workspace)/imports/page.tsx` - added a lightweight authenticated page for recent import runs and storage/kickoff visibility.
- `src/lib/navigation.ts` - added the Imports workspace navigation entry.
- `src/middleware.ts` - excluded `/api/imports/upload` from session-based middleware protection so it can use API-key auth.
