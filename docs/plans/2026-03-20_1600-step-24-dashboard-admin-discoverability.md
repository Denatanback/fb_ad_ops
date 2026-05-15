# Step 24 — Dashboard + Admin Discoverability Polish

**Date:** 2026-03-20
**Scope:** Improve admin nav discoverability and shorten verbose UI copy across workspace pages.

---

## Problem

1. Admin pages (Telegram, Analyzer, Google Drive) had `showInSidebar: false` — admins could only reach them by knowing the URL.
2. Page descriptions contained meta-commentary ("без лишнего описательного шума", "MVP foundation для...", etc.) that read like product docs instead of an ops tool.
3. Topbar descriptions (from navigation items) were also verbose.

## Approach

1. Add `adminOnly` flag to navigation items and a `getWorkspaceNavigationGroupsForRole()` function that filters by role.
2. Pass user role from session through AppShell → Sidebar.
3. Admin nav items become `showInSidebar: true, adminOnly: true` — visible to admins, hidden from members.
4. Shorten all verbose PageHeader descriptions and the worst SectionCard descriptions.
5. Shorten navigation item descriptions (shown in topbar).

## Constraints Followed

- No architecture changes
- No route changes
- No new dependencies
- No analyzer logic changes
- Existing visual system preserved
- Non-admin users see no change in navigation
