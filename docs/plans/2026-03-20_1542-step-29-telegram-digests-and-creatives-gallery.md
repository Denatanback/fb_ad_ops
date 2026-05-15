# План — step 29

1. Перевести Telegram delivery на persistence-backed digest queue: новые digest records, queue processing, 30-минутные окна и cron-ready trigger path.
2. Сохранить immediate delivery только для `import_errors_tech` и admin-safe test flow, а operational topics перевести на queued digests.
3. Расширить import diagnostics и admin notifications visibility для digest status, topic routing, failures и retry/rate-limit states.
4. Добавить отдельную gallery page для creatives с preview-first grid, группировкой по статусу -> approach -> media type.
5. Прогнать build и записать summary / changed-files reports.
