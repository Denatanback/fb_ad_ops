## Changed Files

- `package.json` - kept Prisma generation explicit for local/dev flow and aligned Prisma dependency versions with the installed client.
- `package-lock.json` - aligned the root dependency declarations with the current Prisma version in the lockfile.
- `docker-compose.yml` - passed import-upload and Telegram env vars into the app container and simplified the dev command.
- `.env.example` - made the internal import API key placeholder explicit.
- `README.md` - added a practical live pipeline verification section, sample upload flow, and Windows Prisma generation note.
- `docs/dev/fixtures/meta_ads_daily_ad_report_v1.sample.csv` - added a safe sample CSV for local import verification.
- `src/app/(workspace)/imports/page.tsx` - cleaned and stabilized the imports overview copy for internal verification.
- `src/app/(workspace)/imports/[importRunId]/page.tsx` - cleaned and stabilized the import detail page copy and summaries.
- `src/app/(workspace)/imports/[importRunId]/actions.ts` - cleaned rerun error messaging for the import detail flow.
- `src/server/notifications/telegram-routing.ts` - restored readable topic and reason-code definitions.
- `src/server/notifications/telegram.ts` - restored readable notifier/test-message text and kept routing behavior unchanged.
- `src/server/analyzer/foundation.ts` - restored readable analyzer rule metadata and seed descriptions.
