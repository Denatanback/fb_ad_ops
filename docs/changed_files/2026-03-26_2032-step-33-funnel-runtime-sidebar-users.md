## Changed files

- `docs/plans/2026-03-26_2032-step-33-funnel-runtime-sidebar-users.md`  
  Added the pre-implementation plan for the runtime, sidebar, and users-navigation fix.

- `src/server/db/client.ts`  
  Added a guard against stale cached Prisma client instances in development and recreated the client when required models are missing.

- `src/lib/navigation.ts`  
  Rewrote workspace navigation labels in clean UTF-8, kept `План запусков` in the main sidebar, and added admin navigation for `Пользователи`.

- `src/components/layout/sidebar.tsx`  
  Rebuilt sidebar copy with clean labels and explicit navigation titles.

- `src/components/workspace/settings-section-nav.tsx`  
  Added `Пользователи` to settings navigation and made admin-only items conditional.

- `src/app/(workspace)/settings/page.tsx`  
  Added a direct admin entry point to user management from the settings screen.

- `src/app/(workspace)/admin/users/page.tsx`  
  Embedded the users page into the common settings navigation and clarified page copy.

- `src/app/(workspace)/admin/notifications/page.tsx`  
  Passed admin visibility into the shared settings navigation.

- `src/app/(workspace)/admin/google-drive/page.tsx`  
  Passed admin visibility into the shared settings navigation.

- `src/app/(workspace)/admin/analyzer-rules/page.tsx`  
  Passed admin visibility into the shared settings navigation.

- `src/app/(workspace)/admin/target-costs/page.tsx`  
  Passed admin visibility into the shared settings navigation.

- `docs/summary/2026-03-26_2032-step-33-funnel-runtime-sidebar-users.md`  
  Added the completion summary and verification steps for this fix.
