## Changed Files

- `docs/plans/2026-03-19_2123-step-14-analyzer-rules-and-thresholds.md` - task plan created before implementation.
- `docs/summary/2026-03-19_2123-step-14-analyzer-rules-and-thresholds.md` - task completion summary.
- `prisma/schema.prisma` - added analyzer rule enums and the `AnalyzerRuleConfig` model.
- `prisma/migrations/202603192123_add_analyzer_rule_configs/migration.sql` - added migration SQL for analyzer rule configuration persistence.
- `prisma/seed.cjs` - added default global analyzer/watchdog rule seed records.
- `src/server/analyzer/foundation.ts` - added rule keys, scope/stage types, rule definitions, and default seed templates.
- `src/server/services/analyzer-rules.ts` - added default seeding, admin listing, effective-rule resolution, and upsert support for analyzer rules.
- `src/app/(workspace)/admin/analyzer-rules/actions.ts` - added protected server action for saving analyzer rule configuration.
- `src/app/(workspace)/admin/analyzer-rules/page.tsx` - added the admin-only analyzer rules configuration UI.
- `docs/product/analyzer.md` - documented the current rules/thresholds foundation and override precedence.
- `docs/dev/decisions.md` - recorded the decision to keep analyzer rule configuration explicit and precedence-based.
- `README.md` - documented the analyzer rules admin page and current configuration scope.
