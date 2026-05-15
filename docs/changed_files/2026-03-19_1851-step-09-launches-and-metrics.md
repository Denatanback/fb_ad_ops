# Step 09 Changed Files

- `prisma/schema.prisma` - Added the `BudgetMode` enum and Launch-level `budget_mode` field plus index support.
- `prisma/migrations/202603191855_add_launch_budget_mode/migration.sql` - Added the SQL migration for the new Launch budget mode enum and column.
- `src/lib/launch-taxonomy.ts` - Added shared ABO/CBO metadata and Launch metrics field definitions.
- `src/lib/formatters.ts` - Added date-only, numeric, and date-input formatting helpers used by Launch and Metrics UI.
- `src/server/services/landers.ts` - Added Prisma read helpers for Lander listing and selection.
- `src/server/services/launches.ts` - Added Prisma read helpers for Launch form context, detail views, launch history, and Lander usage summary.
- `src/app/(workspace)/landers/actions.ts` - Added the server action for minimal Lander creation.
- `src/app/(workspace)/launches/actions.ts` - Added server actions for Launch create/edit plus manual Launch Metrics persistence.
- `src/components/workspace/budget-mode-badge.tsx` - Added a reusable ABO/CBO badge for Launch history and detail views.
- `src/components/landers/lander-create-form.tsx` - Added the compact create form for MVP Landers.
- `src/components/launches/launch-form.tsx` - Added the shared Launch create/edit form with separated setup and metrics sections.
- `src/app/(workspace)/landers/page.tsx` - Replaced the placeholder Landers page with a working list and create flow.
- `src/app/(workspace)/creatives/[creativeId]/launches/new/page.tsx` - Added the Launch create page directly under a Creative.
- `src/app/(workspace)/launches/[launchId]/page.tsx` - Added the Launch detail page with setup, budget mode, and metrics display.
- `src/app/(workspace)/launches/[launchId]/edit/page.tsx` - Added the Launch edit page with manual metrics editing.
- `src/app/(workspace)/creatives/[creativeId]/page.tsx` - Updated Creative details to show Launch history, ABO/CBO, metrics snapshots, and a direct Launch creation entry point.
- `src/app/globals.css` - Added internal-tool styles for budget badges, metrics grids, field hints, and the new Launch/Lander surfaces.
