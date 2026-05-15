## What was completed

Fixed the funnel runtime error, improved sidebar and settings navigation, and exposed user management more clearly for admins.

- Patched Prisma client bootstrap so development stops reusing a stale cached client instance without the `LaunchPlan` model.
- Regenerated Prisma Client to align the runtime client with the current schema.
- Reworked workspace navigation so `План запусков` is clearly present in the sidebar and added an admin-visible `Пользователи` item.
- Extended settings navigation and settings screen with a visible entry point to user management for admins.
- Updated the admin users page to sit inside the same settings navigation flow.

## Verification

- `npm run prisma:generate`
- `npm run typecheck`
- `npm run build`
