# Summary

- Added project guidance for the future CSV import, analyzer, persisted alerts, and Telegram notification pipeline.
- Added an environment-based Telegram notifier foundation for the internal web service.
- Added an admin-only internal test page for Telegram delivery checks without implementing the full analyzer yet.
- Updated local setup docs and env placeholders for Telegram configuration.

## Verification
- `npm.cmd run build`
- Verified the app build succeeds with the new notifier and admin route.
- Verified unauthenticated access to `/admin/notifications` redirects to `/sign-in?callbackUrl=%2Fadmin%2Fnotifications`.

## Not verified
- Real Telegram delivery was not tested because no live `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` values were provided.
- CSV upload, import records, analyzer execution, persisted alerts, and notification cooldown logic remain future work.
