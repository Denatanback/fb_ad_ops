# Changed Files

- `docs/plans/2026-03-23_1329-ui-redesign-phase2.md`
  - plan
  - Phase 2 mapping, shell-extension strategy, constraints and non-goals.

- `src/components/workspace/settings-section-nav.tsx`
  - shared UI
  - Added a compact sub-navigation for settings/admin surfaces and included the guide route.

- `src/app/(workspace)/settings/page.tsx`
  - settings
  - Expanded the lightweight settings hub into a real operational settings surface for profile, CSV uploader and system context.

- `src/app/(workspace)/guide/page.tsx`
  - settings / consistency
  - Reskinned the internal guide into the same settings-system pattern and reduced explanatory clutter.

- `src/app/(workspace)/creatives/[creativeId]/page.tsx`
  - creative detail
  - Rebuilt the creative detail surface around media prominence, operational summary and denser launch visibility.

- `src/server/services/approaches.ts`
  - funnels
  - Extended approach listing with recent linked creatives for the new funnels/hypotheses surface.

- `src/components/approaches/approach-create-form.tsx`
  - funnels
  - Tightened the create form into a more honest hypothesis-entry UI over the existing Approach model.

- `src/app/(workspace)/approaches/page.tsx`
  - funnels
  - Turned the approaches page into a structured funnels / hypotheses surface with linked creatives and historical context.

- `src/app/(workspace)/admin/notifications/page.tsx`
  - telegram
  - Reskinned Telegram settings and digest visibility into the Phase 2 admin pattern with denser hierarchy.

- `src/app/(workspace)/admin/analyzer-rules/page.tsx`
  - analyzer settings
  - Aligned the analyzer rules page with the new admin/navigation pattern and cleaner section hierarchy.

- `src/app/(workspace)/admin/target-costs/page.tsx`
  - analyzer settings
  - Aligned target cost settings with the shared admin pattern and Russian-first labels.

- `src/app/(workspace)/admin/google-drive/page.tsx`
  - settings / consistency
  - Brought Google Drive settings into the same compact settings-system layout.

- `src/app/globals.css`
  - shared UI
  - Added Phase 2 layout styles for creative detail hero, funnel cards, compact forms, summary strips and responsive behavior.
