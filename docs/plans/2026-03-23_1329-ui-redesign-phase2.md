## Scope

Phase 2 completes the remaining core operational surfaces on top of the Phase 1 shell:
- creative detail page
- funnels / hypotheses surface
- Telegram page
- analyzer settings surfaces
- general settings surface
- a tight secondary-route consistency pass where old layouts still clash

This is still a UI-first step. Existing backend logic, Prisma schema, routes, import pipeline, analyzer execution, and Telegram digest architecture remain intact.

## Phase 2 Page Mapping

- `/creatives/[creativeId]`
  - redesign into a denser operational detail surface with stronger media prominence and clearer actions/metrics context
- `/approaches`
  - keep the existing Approach-backed route, but reshape it into a more purposeful funnels / hypotheses workspace
- `/admin/notifications`
  - redesign into the new settings/admin UI system with better digest visibility
- `/admin/analyzer-rules`
  - redesign into a clearer analyzer configuration surface
- `/admin/target-costs`
  - visually align with analyzer settings as the second half of the same config area
- `/settings`
  - expand from a lightweight hub into a real general settings surface
- `/admin/google-drive`
  - align visually with the new settings surface
- `/guide`
  - lightly reskin only if needed for consistency with the new settings/navigation cluster
- `/imports/[importRunId]`
  - only a restrained consistency pass if it still feels too far from the new Phase 1 analyzer shell

## How Phase 1 Patterns Will Be Extended

- reuse the Phase 1 shell and sidebar as-is
- extend the compact toolbar / summary-strip / restrained panel rhythm to the remaining admin/settings/detail surfaces
- introduce only a very small shared settings-navigation primitive if it clearly reduces duplication
- keep pages server-first and data shaping close to existing service calls

## Backend / Domain Constraints

- There is no dedicated persisted hypothesis model yet.
  - Phase 2 must stay honest and build a UI-ready funnels surface on top of existing `Approach` data, linked creatives, notes, and historical context
  - no fake “saved hypothesis fields” may be invented
- Creative detail supports existing edit flows and launch history.
  - direct inline editing should only be surfaced where it already exists cleanly
- General settings do not currently have a full persisted profile/language/settings backend.
  - the settings surface should expose current truth and operational entry points, not pretend hidden persistence exists

## Likely Files To Change

- `src/app/(workspace)/creatives/[creativeId]/page.tsx`
- `src/app/(workspace)/approaches/page.tsx`
- `src/app/(workspace)/admin/notifications/page.tsx`
- `src/app/(workspace)/admin/analyzer-rules/page.tsx`
- `src/app/(workspace)/admin/target-costs/page.tsx`
- `src/app/(workspace)/admin/google-drive/page.tsx`
- `src/app/(workspace)/settings/page.tsx`
- `src/app/(workspace)/guide/page.tsx`
- `src/app/(workspace)/imports/[importRunId]/page.tsx`
- `src/components/approaches/approach-create-form.tsx`
- `src/components/workspace/page-header.tsx` only if tiny support changes are needed
- `src/components/workspace/section-card.tsx` only if tiny support changes are needed
- `src/app/globals.css`

Possible small additions if justified:
- a shared settings/admin sub-navigation component

## Skill Influence

- `web-design-guidelines`
  - drives spacing rhythm, scanability, operational grouping, and less card clutter
- `shadcn`
  - encourages a small reusable primitive for settings/admin navigation instead of inventing large custom abstractions
- `vercel-react-best-practices`
  - keeps pages server-first, avoids unnecessary client drift, and preserves existing App Router data boundaries

## Non-Goals

- no domain-model redesign
- no new hypothesis persistence model
- no analyzer/backend rewrite
- no Telegram architecture rewrite
- no CSV/import pipeline changes
- no broad shell redesign that undoes Phase 1
- no fake profile/language persistence if it does not already exist
