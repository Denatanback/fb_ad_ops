# Summary

- Upgraded the Telegram notifier foundation from a single shared-chat sender to a topic-aware forum supergroup notifier with env-driven topic routing.
- Added stable routing keys for `conversions`, `needs_review`, `strong_signals`, `import_errors_tech`, and `bot_test`, plus reason-code support for the `needs_review` bucket.
- Updated the protected admin notifications page so an admin can choose a destination topic and send a real test message through the topic-aware notifier.
- Updated env examples and docs to document shared `TELEGRAM_CHAT_ID` plus per-topic `TELEGRAM_TOPIC_*_ID` configuration.

## Verification
- `npm.cmd run build`
- Verified the notifier and admin page compile successfully.
- Verified unauthenticated `/admin/notifications` redirects to `/sign-in?callbackUrl=%2Fadmin%2Fnotifications`.

## Not verified
- Real Telegram delivery was not tested because no live bot token, chat ID, or topic IDs were provided in this step.
- CSV upload, import persistence, analyzer execution, and alert cooldown behavior remain intentionally out of scope.
