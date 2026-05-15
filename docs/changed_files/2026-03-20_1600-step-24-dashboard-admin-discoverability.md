# Changed Files — Step 24: Dashboard + Admin Discoverability

**Date:** 2026-03-20

## Modified Files

| File | Description |
|------|-------------|
| `src/lib/navigation.ts` | Added `adminOnly` flag, role-aware filtering, shortened all descriptions |
| `src/components/layout/sidebar.tsx` | Accepts `userRole`, renders admin items for admins only |
| `src/components/layout/app-shell.tsx` | Passes user role to Sidebar |
| `src/app/(workspace)/page.tsx` | Shortened dashboard PageHeader description |
| `src/app/(workspace)/guide/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/approaches/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/landers/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/new/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/bulk/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/[creativeId]/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/[creativeId]/edit/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/creatives/[creativeId]/launches/new/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/launches/[launchId]/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/launches/[launchId]/edit/page.tsx` | Shortened PageHeader description |
| `src/app/(workspace)/admin/notifications/page.tsx` | Shortened PageHeader + SectionCard descriptions |
| `src/app/(workspace)/admin/analyzer-rules/page.tsx` | Shortened PageHeader + SectionCard descriptions |
| `src/app/(workspace)/admin/google-drive/page.tsx` | Shortened PageHeader + SectionCard descriptions |

## New Files

| File | Description |
|------|-------------|
| `docs/plans/2026-03-20_1600-step-24-dashboard-admin-discoverability.md` | Plan |
| `docs/summary/2026-03-20_1600-dashboard-admin-discoverability.md` | Summary |
| `docs/changed_files/2026-03-20_1600-step-24-dashboard-admin-discoverability.md` | This file |
