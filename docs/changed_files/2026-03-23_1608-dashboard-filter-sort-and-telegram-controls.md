## Изменённые файлы

### План / отчётность

- `docs/plans/2026-03-23_1608-dashboard-filter-sort-and-telegram-controls.md`
  - короткий план шага
  - тип: report

- `docs/summary/2026-03-23_1608-dashboard-filter-sort-and-telegram-controls.md`
  - итог шага, ограничения и локальные run steps
  - тип: report

- `docs/changed_files/2026-03-23_1608-dashboard-filter-sort-and-telegram-controls.md`
  - список изменённых файлов
  - тип: report

### Dashboard UX

- `src/app/(workspace)/page.tsx`
  - добавлена прокладка для `approachId` и sort query params
  - route теперь передаёт в dashboard и список подходов, и параметры сортировки
  - тип: dashboard UX

- `src/components/dashboard/overview-dashboard.tsx`
  - убрана лишняя meta-copy
  - добавлен фильтр по `Approach`
  - добавлены sortable column headers для подходов и кампаний
  - переработан toolbar в более компактный operational вид
  - тип: dashboard UX

- `src/server/services/historical-aggregates.ts`
  - добавана поддержка `approachId` filter на aggregate-layer
  - дашборд по-прежнему использует service layer, а не ad-hoc фильтрацию во view
  - тип: dashboard data layer

- `src/app/globals.css`
  - добавлены стили для active/hover states sortable headers
  - тип: dashboard UX

### Telegram controls / scheduling

- `prisma/schema.prisma`
  - добавлена модель `SystemSetting`
  - добавлена relation к `User` для audit trail обновления системных настроек
  - тип: settings

- `prisma/migrations/202603231608_add_system_settings/migration.sql`
  - migration для `system_settings`
  - тип: settings

- `prisma/seed.cjs`
  - seed дефолтного `telegram_digest_interval_minutes=30`
  - тип: settings

- `src/server/services/system-settings.ts`
  - новый service layer для системных настроек digest interval / last cycle
  - тип: settings

- `src/server/notifications/digests.ts`
  - digest interval переведён с fixed 30m на runtime-configurable setting
  - digest cycle теперь умеет пропускать запуск до истечения интервала
  - добавлен `force` режим для ручного запуска
  - digest key теперь включает интервал
  - тип: backend scheduling logic

- `src/app/(workspace)/admin/notifications/actions.ts`
  - добавлены server actions:
    - сохранение интервала
    - ручной запуск digest cycle
  - тип: telegram controls

- `src/app/(workspace)/admin/notifications/page.tsx`
  - добавлен UI для выбора интервала
  - добавлена кнопка `Отправить сейчас`
  - добавлены short operational flash messages и summary status
  - тип: telegram controls

- `src/app/(workspace)/settings/page.tsx`
  - обновлена связанная copy про Telegram digest control location
  - тип: copy cleanup
