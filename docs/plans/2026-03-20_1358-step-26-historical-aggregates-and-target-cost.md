## Implementation Plan

1. Extend the persistence layer with a minimal target-cost source of truth that supports a global default and approach overrides without changing the current analyzer execution path.
2. Add historical aggregation services over persisted normalized import rows so the app can query dashboard-ready totals by approach and campaign from cumulative data.
3. Add a small protected admin page for target-cost management, update documentation, and verify the build plus Prisma generation/validation as far as practical.
