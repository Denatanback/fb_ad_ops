# Recovery Audit Summary

## Result
The repository shows **high-severity drift in root bootstrap/runtime files**, but the **core FB Ads Ops application code appears largely intact**.

The strongest evidence is a mismatch between:
- the timestamped implementation history for the internal Facebook Ads operations service
- the current top-level bootstrap/runtime layer, which now presents itself as an unrelated **Agency Spend Sync Monorepo**

## Expected source of truth picture
From `docs/changed_files` and `docs/summary`, the intended implementation history consistently describes:
- one authenticated internal Next.js App Router web service
- Prisma + PostgreSQL
- imports / CSV pipeline
- analyzer and Telegram delivery
- target cost and historical aggregates
- overview dashboard
- creatives CRUD and gallery
- Google Drive-backed creative media
- compact internal workspace shell and admin/settings pages

The documented implementation history expects root runtime files such as:
- `package.json` with Next.js / Prisma scripts
- `.env.example` with DB/auth/import/Google/Telegram placeholders
- `Dockerfile` for the app container
- `docker-compose.yml` with app + db local development flow
- `README.md` describing the internal FB Ads Ops service

## Grounded suspicious drift

### 1. Root runtime/bootstrap layer looks replaced by a different project
Evidence:
- `package.json` now identifies the repo as `agency-spend-sync-monorepo`
- `README.md` now starts with `# Agency Spend Sync Monorepo`
- `.env.example` now contains web/api/worker/bot port variables instead of the expected DB/auth/import/Telegram/Google env surface
- `docker-compose.yml` now runs `web`, `api`, `worker`, and `bot` services under `@agency-spend/*`
- `Dockerfile` now copies `apps/` and `packages/` and launches a pnpm workspace app instead of the documented single web service image

This is not aligned with the intended product history and is the clearest contamination signal.

### 2. Unrelated monorepo scaffold was added
Evidence:
- new top-level `apps/` and `packages/` trees
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- package names such as `@agency-spend/web`, `@agency-spend/api`, `@agency-spend/worker`, `@agency-spend/bot`
- content mentioning Google Sheets, account-to-client mapping, and spend sync orchestration

These terms do not fit the documented FB Ads Ops product direction and are not backed by the timestamped `docs/changed_files` history for this service.

### 3. A foreign planning artifact is present in docs
Evidence:
- `docs/plans/step-001.md` is not timestamped like the rest of the repo’s implementation history
- it describes a different project: an agency-facing spend sync monorepo with API, worker, bot, and Google Sheets

This file is inconsistent with both `AGENTS.md` reporting rules and the rest of the documented build-out.

### 4. Temporary/generated artifact drift is present
Evidence:
- `storage/tmp/step-24-parser-check/**` contains generated JS, `.next`, and temp parser-check outputs
- `apps/web/.next/**`
- root `.next/`
- `tsconfig.tsbuildinfo`

These are more likely leftover runtime/build artifacts than domain contamination, but they do add noise and reduce audit clarity.

## Likely safe areas

These areas are consistent with the documented roadmap and have the expected file shape:
- `src/app/(workspace)/**`
- `src/components/**`
- `src/server/imports/**`
- `src/server/analyzer/**`
- `src/server/notifications/**`
- `src/server/services/**`
- `src/server/integrations/google-drive/**`
- `prisma/schema.prisma`
- `prisma/migrations/202603191648_init_mvp_schema/**`
- `prisma/migrations/202603192011_add_import_and_analyzer_persistence/**`
- `prisma/migrations/202603201358_add_target_cost_configs/**`
- `prisma/migrations/202603201416_add_import_hash_idempotency/**`
- `prisma/migrations/202603201621_add_telegram_digest_queue/**`
- `docs/product/**`
- `docs/ux/**`
- `docs/dev/**`
- `docs/roadmap/**`
- timestamped files in `docs/plans`, `docs/summary`, and `docs/changed_files`

Additional evidence:
- expected product files for Telegram digest queue exist:
  - `src/server/notifications/digests.ts`
  - `src/app/api/notifications/digests/cycle/route.ts`
- expected gallery files exist:
  - `src/app/(workspace)/creatives/gallery/page.tsx`
  - `src/components/creatives/creative-gallery-card.tsx`
- historical aggregate and target cost foundations exist:
  - `src/server/services/historical-aggregates.ts`
  - `src/server/services/target-costs.ts`

## Files and modules most likely affected unexpectedly
- `package.json`
- `README.md`
- `.env.example`
- `docker-compose.yml`
- `Dockerfile`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `apps/**`
- `packages/**`
- `docs/plans/step-001.md`
- `storage/tmp/step-24-parser-check/**`

## Recovery severity estimate
**High**

Reasoning:
- the core product code appears recoverable and still present
- but the repository’s top-level entrypoints and onboarding/runtime documents are currently pointing at a different architecture and different business problem
- that kind of drift can mislead every future run/build/deploy step and can mask the real application state

So this is not “catastrophic source loss,” but it is **high-severity operational drift**.

## Recommended next-step restore strategy
1. Freeze the current repository state and make a full backup copy before any cleanup.
2. Treat `src/`, `prisma/`, and timestamped docs as the primary recovery baseline.
3. In a separate restore step, compare and reconstruct the intended top-level bootstrap files from documented history:
   - `package.json`
   - `README.md`
   - `.env.example`
   - `Dockerfile`
   - `docker-compose.yml`
4. Quarantine, do not immediately delete, the clearly foreign scaffold:
   - `apps/**`
   - `packages/**`
   - `pnpm-workspace.yaml`
   - `pnpm-lock.yaml`
   - `docs/plans/step-001.md`
5. Separately clean generated/runtime residue after the bootstrap layer is restored:
   - `storage/tmp/step-24-parser-check/**`
   - root `.next/`
   - `apps/web/.next/**`
   - `tsconfig.tsbuildinfo`
6. After that restore, run a dedicated verification pass against the intended app only:
   - root Next.js app routes
   - Prisma schema/migrations
   - imports/analyzer/Telegram surfaces
   - overview dashboard
   - creatives/gallery/media flows

## Notes
- No code files were modified in this audit step.
- This audit is conservative: items were marked suspicious only when they conflict directly with the documented implementation history or product domain.
