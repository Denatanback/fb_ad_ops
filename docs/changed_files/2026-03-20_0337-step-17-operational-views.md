# Step 17 Changed Files

- `src/server/services/operations.ts` — added the shared operational query/service layer for Queue, Active, and Scaling views.
- `src/components/operations/operational-filters.tsx` — added compact GET filters for query, approach, label, and sort.
- `src/components/operations/operational-summary-cards.tsx` — added top-level operational counters and latest-import summary cards.
- `src/components/operations/operational-creatives-table.tsx` — added the reusable operational table with launches, metrics, and attention signals.
- `src/components/operations/operational-workspace-view.tsx` — added the shared page shell for operational views.
- `src/app/(workspace)/queue/page.tsx` — replaced the placeholder page with the real Queue operational view.
- `src/app/(workspace)/active/page.tsx` — replaced the placeholder page with the real Active operational view.
- `src/app/(workspace)/scaling/page.tsx` — replaced the placeholder page with the real Scaling operational view.
- `src/lib/navigation.ts` — restored the missing navigation file and updated workspace route definitions.
- `src/components/layout/sidebar.tsx` — refreshed sidebar copy and navigation rendering around the restored route model.
- `src/components/layout/topbar.tsx` — refreshed topbar copy and removed the role-label dependency on broken shared copy.
- `src/components/auth/sign-out-button.tsx` — simplified visible sign-out copy for the shell.
- `src/components/ui/theme-toggle.tsx` — refreshed visible theme-toggle labels.
- `src/lib/creative-taxonomy.ts` — refreshed lifecycle and label metadata copy used across operational UI.
- `src/lib/launch-taxonomy.ts` — refreshed budget-mode metadata copy used in launch badges.
- `src/lib/formatters.ts` — added numeric/percent helpers for compact operational metrics rendering.
- `src/components/workspace/empty-state.tsx` — refreshed shared empty-state eyebrow copy.
- `src/app/globals.css` — added the operational summary/table/attention styling needed for the new views.
