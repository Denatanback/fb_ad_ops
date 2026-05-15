## Goal

Fix the runtime error when opening funnel pages, make launch plans clearly visible in sidebar navigation, and expose user management so admins can find it.

## Implementation plan

1. Patch the Prisma client bootstrap so development does not reuse a stale cached client instance that predates the `LaunchPlan` model.
2. Update workspace navigation and settings navigation to surface both `План запусков` and `Пользователи` clearly in the UI.
3. Add a visible admin entry point for user management from the settings screen.
4. Verify with type-check and production build, then record summary and changed files.
