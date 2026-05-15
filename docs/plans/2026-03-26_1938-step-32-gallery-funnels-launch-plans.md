## Goal

Finish the workflow between creatives gallery, funnels, and launch plans so the team can upload creatives, assign them to funnels, and build structured launch plans with generated naming.

## Implementation plan

1. Review the existing gallery, approaches, and launch-plans flow to reuse current Prisma models and navigation instead of introducing new entities.
2. Add a funnel assignment workflow so creatives from the gallery can be distributed into approaches/funnels from the funnel detail screen and surfaced more clearly in the gallery.
3. Expand launch plan UX with prefilled creation from a funnel, a stronger list view, and a detail page that supports editing plan parameters and regenerating naming.
4. Verify the updated flow with type-check/build signals, then document the work in `docs/summary` and `docs/changed_files`.
