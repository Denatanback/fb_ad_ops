## Completion Summary

- Added a minimal persistent target-cost foundation with a global default plus approach and funnel overrides, including a protected admin page at `/admin/target-costs`.
- Added cumulative historical aggregate services over completed normalized imports so the app can query dashboard-ready summaries by approach and campaign without replacing the current per-import analyzer execution path.
- Documented the new historical base, target-cost precedence, and dashboard-ready aggregate outputs in the README and analyzer/dev docs.

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:validate`
- `npm.cmd run build` with local env overrides for `DATABASE_URL`, `AUTH_SECRET`, `APP_BASE_URL`, and `INTERNAL_IMPORT_API_KEY`
- Build completed successfully and included the new `/admin/target-costs` route.
- The existing Prisma authentication warnings during static generation remained present because the local PostgreSQL credentials in this environment are not valid; they were not introduced by this step.
