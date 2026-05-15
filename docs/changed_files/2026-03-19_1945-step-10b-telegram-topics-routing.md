# Changed Files

- `.env.example` - added placeholder topic/thread ID environment variables for Telegram forum routing.
- `README.md` - documented Telegram forum-topic configuration and the updated admin-only test flow.
- `docs/product/analyzer.md` - documented forum-topic routing buckets and `needs_review` reason codes.
- `docs/dev/decisions.md` - recorded the decision to route Telegram notifications through forum topics in a shared supergroup.
- `docs/dev/tech-foundation.md` - documented the topic ID environment variables and forum-topic delivery model.
- `src/server/notifications/telegram-routing.ts` - added stable topic keys, reason codes, and destination parsing helpers.
- `src/server/notifications/telegram.ts` - upgraded the notifier to resolve topic IDs and send with `message_thread_id`.
- `src/app/(workspace)/admin/notifications/actions.ts` - updated the protected test action to accept a destination topic and optional `needs_review` reason code.
- `src/app/(workspace)/admin/notifications/page.tsx` - updated the admin test UI to choose a topic, show route configuration, and report topic-specific send results.
