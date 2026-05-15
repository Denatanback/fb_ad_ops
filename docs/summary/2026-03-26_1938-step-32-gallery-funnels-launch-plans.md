## What was completed

Finished the workflow between creatives gallery, funnels, and launch plans.

- Connected gallery and funnels by making unassigned creatives distributable from the funnel detail page.
- Improved the gallery so each group now clearly leads either to funnel assignment or directly into launch-plan creation.
- Reworked launch-plan creation around a shared form with prefilled creatives from funnels, stronger structure validation, and generated naming that respects campaign/ad set/creative counts.
- Expanded the launch-plan detail page so plans can be edited in place, including status, budget mode, structure, selected creatives, and regenerated naming.
- Fixed related nullability issues for unassigned creatives so the updated flow builds cleanly.

## Verification

- `npm run typecheck`
- `npm run build`
