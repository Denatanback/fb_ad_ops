## Changed files

- `docs/plans/2026-03-26_1938-step-32-gallery-funnels-launch-plans.md`  
  Added the short implementation plan required before code changes.

- `src/server/services/launch-plans.ts`  
  Reworked launch-plan service logic: added structure validation, robust naming generation, funnel-aware creative validation, plan filtering by approach, and plan updating support.

- `src/app/(workspace)/launch-plans/actions.ts`  
  Added safer form parsing, user-friendly redirects on validation errors, and update action support for existing plans.

- `src/components/launch-plans/launch-plan-form.tsx`  
  Added a shared launch-plan editor used for both creation and editing, with grouped creative selection and structure summary.

- `src/app/(workspace)/launch-plans/new/page.tsx`  
  Rebuilt the new-plan page around the shared form and added prefill support from funnel/gallery entry points.

- `src/app/(workspace)/launch-plans/[planId]/page.tsx`  
  Expanded the detail page into a full editor with summary stats and generated naming tables.

- `src/app/(workspace)/launch-plans/page.tsx`  
  Refined the plans index page with clearer summaries and stronger navigation to gallery and funnels.

- `src/app/(workspace)/approaches/actions.ts`  
  Added bulk assignment of selected creatives into a funnel from the funnel detail page.

- `src/app/(workspace)/approaches/[approachId]/page.tsx`  
  Connected funnels to gallery and launch plans by adding unassigned-creative intake, recent plan visibility, and prefilled launch-plan actions.

- `src/app/(workspace)/creatives/gallery/page.tsx`  
  Strengthened the gallery as the first step of the workflow and added clearer transitions into funnel assignment and plan creation.

- `src/components/creatives/creative-gallery-card.tsx`  
  Made gallery cards safe for creatives that are still unassigned to a funnel.

- `src/app/globals.css`  
  Added styling for the launch-plan editor, assignment grid, and updated gallery/funnel linking elements.

- `src/app/(workspace)/creatives/actions.ts`  
  Tightened status validation so creative form parsing remains type-safe.

- `src/app/(workspace)/creatives/[creativeId]/page.tsx`  
  Fixed approach rendering for creatives that do not yet belong to a funnel.

- `src/app/(workspace)/creatives/page.tsx`  
  Fixed list rendering for creatives without an assigned funnel.

- `src/app/(workspace)/launches/[launchId]/page.tsx`  
  Fixed launch detail rendering for creatives without an assigned funnel.

- `src/server/services/operations.ts`  
  Added a safe fallback approach label for operational rows when a creative is still unassigned.

- `docs/summary/2026-03-26_1938-step-32-gallery-funnels-launch-plans.md`  
  Added the post-implementation summary and verification notes.
