# Changed Files

- `.env.example` - added Telegram-related environment variable placeholders.
- `README.md` - documented Telegram configuration and the admin-only test flow.
- `docs/dev/decisions.md` - added the future CSV import, analyzer, alerts, and Telegram pipeline direction.
- `docs/dev/tech-foundation.md` - added module and environment guidance for imports, analyzer, alerts, and notifications.
- `docs/product/analyzer.md` - documented the intended future analyzer flow, comparison logic, alert types, and anti-noise rules.
- `docs/roadmap/backlog.md` - added small Post-MVP backlog items for analyzer kickoff and Telegram-backed alerts.
- `src/server/analyzer/foundation.ts` - added minimal analyzer-facing types and pipeline constants for future work.
- `src/server/notifications/telegram.ts` - added reusable Telegram notifier wiring and status helpers.
- `src/app/(workspace)/admin/notifications/actions.ts` - added the admin-only server action for a Telegram test send.
- `src/app/(workspace)/admin/notifications/page.tsx` - added the protected internal Telegram notifications test page.
