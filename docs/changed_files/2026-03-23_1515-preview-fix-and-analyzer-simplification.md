## Modified Files

- `docs/plans/2026-03-23_1515-preview-fix-and-analyzer-simplification.md`
  - task plan
  - type: planning

- `src/server/services/creative-media.ts`
  - added shared preview source resolution for image/video media
  - type: preview fix

- `src/components/creatives/creative-preview.tsx`
  - added compact shared preview renderer with honest fallback and source retry
  - type: preview fix

- `src/server/services/creatives.ts`
  - extended gallery data selection with media reference fields needed for shared preview resolution
  - type: preview fix

- `src/components/creatives/creative-gallery-card.tsx`
  - switched gallery cards to shared preview resolver/component instead of hard-coded `<img>` logic
  - type: preview fix

- `src/app/(workspace)/creatives/[creativeId]/page.tsx`
  - updated creative detail preview stage to use shared preview resolution and cleaner operator-facing media actions
  - type: preview fix / hierarchy cleanup

- `src/app/(workspace)/creatives/actions.ts`
  - corrected Drive upload preview fallback order so direct content link is preferred over Drive view page
  - type: preview fix

- `src/server/services/import-runs.ts`
  - added analyzer workspace shaping layer for strong subjects, weak subjects, and best metrics by approach
  - type: analyzer UX / hierarchy cleanup

- `src/app/(workspace)/imports/page.tsx`
  - rebuilt main Analyzer screen into buyer-first layout with current import selector, strong/weak lists, and approach metric summaries
  - type: analyzer UX / hierarchy cleanup / copy cleanup

- `src/app/globals.css`
  - added video preview styling for gallery and creative detail surfaces
  - type: spacing / density / preview support

- `docs/summary/2026-03-23_1515-preview-fix-and-analyzer-simplification.md`
  - completion summary
  - type: reporting
