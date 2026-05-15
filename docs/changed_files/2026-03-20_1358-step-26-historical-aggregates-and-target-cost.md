## Changed Files

- `prisma/schema.prisma` — added the `TargetCostConfig` model and linked it to `Approach`.
- `prisma/migrations/202603201358_add_target_cost_configs/migration.sql` — added the SQL migration for target-cost persistence.
- `prisma/seed.cjs` — seeded a default global target cost.
- `src/server/services/target-costs.ts` — added target-cost defaults, override resolution, admin data loading, and upsert logic.
- `src/server/services/historical-aggregates.ts` — added cumulative dashboard-ready aggregates by approach and campaign over completed normalized import rows.
- `src/app/(workspace)/admin/target-costs/actions.ts` — added the protected server action for saving target-cost configs.
- `src/app/(workspace)/admin/target-costs/page.tsx` — added the minimal admin UI for global, approach, and funnel target-cost settings plus a small historical snapshot.
- `src/lib/navigation.ts` — added navigation access to the new admin target-cost page.
- `README.md` — documented the target-cost foundation and dashboard-ready historical aggregates.
- `docs/product/analyzer.md` — documented cumulative aggregate behavior, target-cost scope precedence, and what still remains out of scope.
- `docs/dev/decisions.md` — recorded the target-cost and historical-aggregate architectural direction.
- `docs/plans/2026-03-20_1358-step-26-historical-aggregates-and-target-cost.md` — task plan for this step.
- `docs/summary/2026-03-20_1358-step-26-historical-aggregates-and-target-cost.md` — task completion summary for this step.
