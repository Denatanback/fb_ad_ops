# Changed Files

- `docs/plans/2026-03-23_1142-runtime-validation-and-telegram-digest-check.md`
  - type: diagnostic
  - why: recorded scope, assumptions, validation targets, and non-goals before code changes

- `src/server/services/import-runs.ts`
  - type: fix
  - why: digest-backed alert coverage was not represented honestly in import-run diagnostics; added digest-aware counters, per-topic digest summaries, and recent digest visibility

- `src/app/(workspace)/imports/[importRunId]/page.tsx`
  - type: diagnostic
  - why: surfaced digest queue state on the import detail page so operators can see which alert events were queued into digests and what happened to those digest windows

- `src/app/(workspace)/admin/notifications/page.tsx`
  - type: diagnostic
  - why: added a compact recent-digests section for admin/runtime verification of the Telegram digest queue

- `docker-compose.yml`
  - type: fix
  - why: the bind-mounted dev container could start with an empty `/app/node_modules` volume; startup now bootstraps dependencies before Prisma generation and `next dev`

- `docs/summary/2026-03-23_1142-runtime-validation-and-telegram-digest-check.md`
  - type: diagnostic
  - why: recorded what was checked, what broke, what was fixed, and exact local verification steps
