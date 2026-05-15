## Dashboard Changes

- Упростить copy на главном dashboard и убрать абстрактные описания.
- Добавить простой filter по `Approach`.
- Добавить сортировку по клику на заголовки для основных таблиц:
  - отдельная сортировка для подходов
  - отдельная сортировка для кампаний
- Сохранить existing aggregate-backed flow и не переносить расчётную логику в view ad-hoc.

## Telegram Scheduling / Manual Send Strategy

- Сохранить текущую digest architecture:
  - `AlertEvent` = source of truth
  - `NotificationDigest` = digest entity
  - `NotificationDelivery` = delivery audit
- Добавить persisted app setting для digest interval:
  - 15 / 30 / 45 / 60 минут
- Не завязывать interval на внешний cron.
- Digest cycle при запуске сам проверяет:
  - configured interval
  - elapsed time since last cycle
- Manual send в admin page должен форсировать cycle сразу, без отката к event-by-event delivery.

## DB / Settings Change

- Нужен маленький settings persistence layer для Telegram digest interval и last cycle timestamp.
- Планируем минимальную generic settings table вместо большого config subsystem.

## Likely Files To Change

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.cjs` если default setting будет seeding-friendly
- `src/server/services/historical-aggregates.ts`
- `src/app/(workspace)/page.tsx`
- `src/components/dashboard/overview-dashboard.tsx`
- `src/server/notifications/digests.ts`
- `src/app/api/notifications/digests/cycle/route.ts`
- `src/app/(workspace)/admin/notifications/page.tsx`
- `src/app/(workspace)/admin/notifications/actions.ts`
- `src/app/globals.css` только если понадобится минимальный visual polish

## Non-goals

- Не делать новый dashboard redesign.
- Не менять analyzer logic или aggregate formulas широко.
- Не переделывать Telegram architecture в realtime/event-by-event модель.
- Не строить новый cron/scheduler subsystem.
