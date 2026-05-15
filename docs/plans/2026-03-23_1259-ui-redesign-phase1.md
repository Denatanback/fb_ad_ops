## Scope

Focused UI overhaul for Phase 1 only inside the existing FB Ads Ops web service:
- workspace shell and persistent sidebar
- dashboard overview page
- creatives list/gallery surfaces
- analyzer section shell around CSV upload, imports history, and analysis results framing
- global navigation alignment with the new IA

No backend/domain redesign, no Prisma changes, no analyzer/import logic rewrite.

## Assumptions

- Existing server data flows, routes, and Prisma models remain the source of truth.
- Current historical aggregates, imports pipeline, creatives CRUD, and analyzer logic are already working and should be reskinned rather than replaced.
- `/` remains the most natural placement for the operational dashboard.
- `Approaches` can act as the closest Phase 1 landing surface for the requested `Воронки` section without inventing a new backend concept.

## Current To Target Mapping

- `/` current dashboard -> stays `/`, reskinned into the main operational overview
- `/creatives` current list -> stays `/creatives`, becomes denser list-first management surface
- `/creatives/gallery` current gallery -> stays `/creatives/gallery`, upgraded into the main visual media-library view
- `/approaches` current approaches list -> represented in nav as `Воронки` for Phase 1 shell alignment
- `/imports` current imports page -> becomes the main `Анализатор` landing surface with clearer section framing
- `/imports/[importRunId]` current import detail -> preserved, only inherit shell improvements if needed indirectly
- admin/settings routes -> kept in navigation under `Телеграм`, `Настройки анализатора`, `Настройки` with only light placement adjustments in this phase

## Shell/Layout Strategy

- Keep the existing App Router workspace layout and server component boundaries.
- Reduce card nesting and promo-style framing in the shell.
- Turn sidebar into the primary navigation anchor with short labels and tighter grouping.
- Use a wide main workspace with compact topbar metadata and horizontal local toolbars where needed.
- Prefer a small shared set of layout primitives/styles instead of introducing a new component system.

## Likely Files To Change

- `src/lib/navigation.ts`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/topbar.tsx`
- `src/app/(workspace)/page.tsx`
- `src/components/dashboard/overview-dashboard.tsx`
- `src/app/(workspace)/creatives/page.tsx`
- `src/app/(workspace)/creatives/gallery/page.tsx`
- `src/components/creatives/creative-gallery-card.tsx`
- `src/components/creatives/creative-filters.tsx`
- `src/app/(workspace)/imports/page.tsx`
- `src/app/globals.css`

Potentially tiny supporting updates only if they reduce duplication cleanly:
- `src/components/workspace/page-header.tsx`
- `src/components/workspace/section-card.tsx`

## Skill Influence

- `web-design-guidelines`
  - drives density, spacing rhythm, hierarchy, scanability, and reduced decorative chrome
  - pushes toward fewer nested cards, calmer surfaces, and clearer sidebar/workspace separation
- `shadcn`
  - used as a practical mindset for reusable primitives and restrained UI composition
  - no shadcn CLI generation planned because the repo does not expose a standard `components.json`
- `vercel-react-best-practices`
  - keep pages server-first
  - avoid unnecessary client sprawl during UI reskin
  - keep data shaping out of page JSX when possible and preserve current App Router boundaries

## Non-Goals

- No Phase 2 work for Telegram, analyzer settings, or general settings pages beyond navigation placement
- No backend or schema changes
- No analyzer/import pipeline rewrite
- No auth redesign
- No new dependencies
- No broad shell refactor outside the requested Phase 1 surfaces
