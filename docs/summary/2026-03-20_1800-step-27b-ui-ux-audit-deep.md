# Summary — Step 27b: Deep UI/UX Audit

**Status:** Audit-only pass. No code changes.
**Lenses:** web-design-guidelines · shadcn/ui patterns · Vercel/App Router best practices

---

## What the product does well

- Server-component architecture is correct; data fetching is already server-side
- Design token system (CSS variables, dark/light theme) is solid and consistent
- Status badge language (lifecycle status, target cost tones, delivery status) is effective
- Data tables are clean and appropriately structured
- Role-based navigation filtering works correctly
- Three-group sidebar (Операции / Библиотека / Система) is the right conceptual structure
- Flash message + server action feedback pattern is correct

---

## Root cause of the current UX problem

**The app overuses Gestalt enclosure.** Every element — navigation items, stat cards, filter panels, help notes, form groups, tables, annotations — receives the same treatment: `border + border-radius: 18px + background-fill + 16px padding + heading`.

When everything is a box, nothing is primary. The eye has no entry point and no rest point. The result: pages that feel uniformly heavy and require scanning effort that an internal operations tool should not require.

---

## 10 most impactful findings

| # | Finding | Severity |
|---|---|---|
| 1 | Import run detail has alert events in section 11 of 14. The most operationally relevant data is at the bottom. | Critical |
| 2 | Dashboard approach cards: "Открыть подходы" links to the full list, not the specific approach. Functional scope mismatch. | Critical |
| 3 | Stat cards have `stat-copy` paragraphs that re-describe the stat label. Noise on every page. | Critical |
| 4 | Admin pages (target-costs, google-drive) contain developer documentation and dashboard data that belong elsewhere. | Critical |
| 5 | Sidebar nav items styled as bordered cards — identical chrome to content cards. Navigation blends into content. | Important |
| 6 | Every page has three sources of the same title: sidebar active item + topbar h1 + PageHeader h2. | Important |
| 7 | SectionCard is the only card primitive, used for filters, tables, forms, help text, and nav-adjacent actions alike. | Important |
| 8 | Creative detail renders 10 metadata URL fields even when 7 say "Не указан". | Important |
| 9 | Gallery has no filter controls, no total count, and a mode switcher with no visible active state. | Important |
| 10 | Language inconsistency: English nav labels, English eyebrow text, backtick `CODE_REFS` in Russian operator copy. | Important |

---

## 10 recommended UI primitives (replacing "blocks everywhere")

| Primitive | Purpose | Replaces |
|---|---|---|
| `page-shell` | h2 + right-aligned action buttons. No border, no background. | PageHeader + topbar title |
| `summary-strip` | Horizontal `label: value` pairs. Subtle background. No per-item borders. | `stats-inline` + stat cards with paragraphs |
| `filter-bar` | Flat row: filters left, mode switch right. No card chrome. | SectionCard wrapping filters |
| `section-heading` | Plain h3 + optional count badge. No box. Whitespace does the grouping. | SectionCard title for tables |
| `data-panel` | Working area for tables/grids. No outer border. | SectionCard wrapping data tables |
| `annotation-block` | Subdued background, small text, no border. For help/reference content. | SectionCard for help/explanatory sections |
| `settings-section` | h3 heading + fields below. No card per field group. Groups by whitespace + separator. | admin-form-panel with h4 + p + border |
| `entity-card` | Full border + strong background. For distinct entities (approach widget, config entry). | Already approximately correct on dashboard |
| `detail-sidebar` | 260px right column for timestamps, metadata, audit on detail pages. | hero-grid pattern (should be more systematic) |
| `status-strip` | Single dense row: key outcomes for diagnostic pages. | 4 stat cards on import run detail |

---

## Execution sequence (6 passes)

| Pass | Focus | Risk | Key deliverables |
|---|---|---|---|
| **A** | Content removal + copy cleanup | Zero structural change | Remove stat-copy, remove wrong content from admin pages, translate eyebrows, remove backtick refs |
| **B** | Import run detail restructure | Medium, one page | Alerts first, diagnostics last, remove duplicate analyzer summary |
| **C** | Navigation + functional fix | Low–medium | Fix approach card link, sidebar card→link style, topbar title removal |
| **D** | Filter system cleanup | Medium, cross-cutting | Filter bars on dashboard/imports/creatives, gallery filter, mode switcher |
| **E** | Detail page cleanup | Low | Creative detail: hide empty fields, remove descriptive stat cards; analyzer rules: forms first |
| **F** | New CSS primitives | Low–medium | Formally introduce summary-strip, filter-bar, annotation-block, settings-section, data-panel |

---

## Files to prioritize for implementation

1. `src/app/(workspace)/imports/[importRunId]/page.tsx` — highest per-page operator impact
2. `src/components/dashboard/overview-dashboard.tsx` — most visible page
3. `src/app/globals.css` — CSS system (Pass F new primitives)
4. `src/components/workspace/section-card.tsx` — the overloaded universal container
5. `src/components/layout/sidebar.tsx` — navigation chrome
6. `src/components/layout/topbar.tsx` — title repetition source
7. `src/app/(workspace)/admin/target-costs/page.tsx` — wrong content removal
8. `src/app/(workspace)/admin/google-drive/page.tsx` — wrong content removal
