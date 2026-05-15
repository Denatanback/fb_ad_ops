# Changed Files

- `prisma/schema.prisma` - added enums and models for import runs, raw rows, normalized rows, analyzer comparison groups/results, alert events, and notification deliveries.
- `prisma/migrations/202603192011_add_import_and_analyzer_persistence/migration.sql` - added the SQL migration for the new persistence layer.
- `src/server/analyzer/foundation.ts` - extended analyzer foundation constants with import statuses, alert severities, and notification delivery statuses.
- `src/server/services/import-runs.ts` - added helpers to create import runs and update processing state.
- `src/server/services/alerts.ts` - added helpers to record alert events and notification deliveries.
- `docs/product/analyzer.md` - documented the persistence foundation for imports, analyzer outputs, alerts, and delivery tracking.
