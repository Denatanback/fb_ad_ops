# Decisions

Record important technical and architectural decisions here.

## Initial rules
- Keep domain naming aligned with docs/product/entities.md
- Avoid premature abstraction
- Keep patches small
- Prefer incremental delivery
- Treat the product as a multi-user internal web service for a shared team workspace during MVP.
- Make authentication and roles first-class concerns in architecture, routing, and data model design.
- Keep the UI direction consistent with the dark-first, Linear-inspired, data-focused internal-tool approach documented in `docs/ux/ui-direction.md`.

## MVP technical foundation
- Use a single TypeScript monolith based on Next.js App Router for the web app, server-rendered UI, and internal API endpoints.
- Use PostgreSQL as the primary database.
- Use Prisma for schema management, migrations, and typed data access.
- Use Auth.js with a Prisma-backed session model for MVP authentication, starting with email/password credentials and `admin` / `member` roles.
- Treat the product as a single-workspace internal service, not a public multi-tenant SaaS.
- Keep authorization simple for MVP: authenticated access to the app, `admin` for user management, and `member` for operational use. More granular permissions remain out of scope unless explicitly requested later.
- Default the UI to dark mode, support a light theme toggle, and implement theming with shared design tokens so the operational UI stays consistent across tables, filters, and detail pages.
- Deploy as a Dockerized web container plus PostgreSQL, keeping the architecture simple and easy to run locally and on a single server.
- For creative originals in the MVP media phase, use one admin-controlled Google OAuth connection to a personal Google Drive / My Drive folder instead of assuming Google Workspace or Shared Drives.
- Keep creative media preview-first and link-first: prefer external Drive-backed originals plus stored reference links over default app-server storage of full original videos.
- Keep the detailed implementation outline in `docs/dev/tech-foundation.md`.

## Future import and alerting direction
- Treat CSV import, analyzer execution, persisted alerts, and Telegram delivery as one future internal pipeline rather than unrelated utilities.
- The intended flow is: CSV upload arrives, an import record is created, background processing starts, analyzer outputs rankings and alert candidates, alerts are persisted, then Telegram delivery runs when policy allows.
- Keep analyzer output transparent: comparison groups, evaluation mode, confidence, maturity gates, and cooldown decisions should be inspectable later instead of hidden in opaque scoring.
- Keep Telegram integration server-side and fully environment-based so secrets never live in source control or client code.
- Route Telegram notifications through forum topics in a shared supergroup so alert categories stay separated without introducing multiple bots or chats.
- Keep analyzer rule configuration simple and explicit: global defaults first, then approach overrides, then funnel overrides.
- Keep target-cost configuration equally explicit: one global default first, then approach overrides, then funnel overrides.
- Support watchdog-style manual guardrails alongside future relative benchmark logic, but avoid building a generic rules engine before the analyzer behavior is proven.
- Run the first analyzer/watchdog pass automatically after import normalization so CSV uploads already produce persisted comparison groups, analyzer results, alerts, and delivery tracking in one server-side flow.
- Build future dashboard work on cumulative normalized import history and stable server-side aggregates by approach and campaign instead of treating each CSV as a disposable isolated report.
