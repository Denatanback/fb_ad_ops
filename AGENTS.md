# Project context

This project is an internal Facebook Ads operations system for in-house media buying.
It is a multi-user internal web service for a team.

## Domain rules
- Offer is not a separate entity.
- The top-level business entity is Approach.
- A Creative belongs to exactly one Approach.
- A Creative can have many Launches.
- Launch analytics are tracked per Creative + Lander + Setup.
- Scaling is a distinct operational phase.
- Winner, Loser, and Top CTR are tags/labels, not primary lifecycle statuses.

## Core statuses
- queue
- active
- stopped
- scaling

## Tags / labels
- winner
- loser
- top_ctr

## Metrics
- cpc
- ctr
- cplpv
- outbound_ctr
- cpm
- clicks
- cr
- results
- cost_per_result

## Product direction
- Support authenticated accounts from the beginning.
- Do not design this as a public multi-tenant SaaS unless explicitly requested later.
- Assume a single internal workspace for MVP.
- Consider auth and user roles in architecture, routing, and data model decisions from the beginning.

## UI direction
- Design the UI as dark-first with light theme support.
- Keep the visual direction Linear-inspired.
- Keep data interaction patterns Airtable/Notion-inspired.
- Prioritize practical tables, filters, detail pages, and operational views over decorative UI.

## Working rules
- Read docs/product/entities.md and docs/product/workflows.md before changing domain code.
- Read docs/product/access.md and docs/ux/ui-direction.md before making implementation decisions that affect access, layout, or application structure.
- Read docs/roadmap/* before making implementation decisions.
- Prefer small, reviewable patches.
- Update docs when changing domain behavior.
- Do not introduce new dependencies unless necessary.
- Keep naming consistent with domain language.
- Do not collapse Launch data into Creative fields.
- Do not add Offer as a separate business entity.
- Never overwrite, replace, or regenerate existing files in docs/roadmap unless explicitly asked.

## Codex reporting workflow
- Before making code changes, write a short implementation plan in `docs/plans`.
- After finishing, write a concise completion summary in `docs/summary`.
- After finishing, write a changed-files report with short descriptions in `docs/changed_files`.
- Use Windows-safe timestamped filenames in the format `YYYY-MM-DD_HHmm-step-XX-short-name.md`.
- Example report filename: `2026-03-19_1600-step-01-reporting.md`.
