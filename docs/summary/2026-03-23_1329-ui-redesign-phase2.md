# UI Redesign Phase 2

## Что было переработано

- Доведён `creative detail` в новом shell-стиле: крупное медиа-превью, компактная operational rail, быстрые действия, ссылки на media refs и более читаемая история запусков.
- Раздел `Воронки` стал честной hypothesis-oriented поверхностью поверх текущего `Approach`-слоя: гипотеза, связанные креативы, historical context и naming / CSV связка без выдуманной новой persistence-модели.
- `Телеграм`, `Настройки анализатора`, `Целевой CPA`, `Google Drive`, `Общие` и `Гид` выровнены под общий settings/admin pattern с единым sub-nav и более плотной иерархией.
- `Общие настройки` из Phase 1 хаба расширены в полноценную системную страницу с профилем, uploader-контуром, локализацией и связанными разделами.
- Добавлены недостающие layout-стили для Phase 2: creative detail hero, funnel cards, compact forms и single-summary strips.

## Что осталось ограничено текущей логикой

- Полноценной persisted hypothesis-модели по-прежнему нет; раздел `Воронки` честно использует существующие `Approach` поля, связанные креативы и historical aggregates.
- В creative detail не добавлялась новая inline-edit логика: редактирование по-прежнему идёт через существующие edit / launch flows.
- Раздел `Настройки` не получил новых backend-возможностей; UI отражает текущие реальные capabilities без фиктивной persistence-логики.

## Что было сохранено

- Business logic, Prisma models, imports pipeline, analyzer, Telegram digest architecture и single-service app identity не менялись.
- Existing routes сохранены.
- Server-first App Router границы сохранены: новые страницы остались server components, shared UI additions минимальны.

## Промежуточные UI-решения из-за ограничений домена

- `Воронки` оформлены как operational surface по подходам, а не как fake CRUD для отдельной сущности `Hypothesis`.
- `Guide` встроен в settings-navigation как supporting surface, а не как отдельный визуальный режим.
- `Target cost` оставлен отдельным admin surface внутри общего блока analyzer settings, а не смешан с правилами в один огромный экран.

## Проверка

- `npm.cmd run build` — passed
- `npm.cmd run typecheck` — passed

## Риски для ручного просмотра

- Нужен живой browser-pass для плотности длинных русских строк на `creative detail`, `approaches` и settings/admin surfaces.
- Стоит отдельно проверить non-empty состояния `Google Drive`, `Telegram` и `target cost` с реальными данными, чтобы оценить вертикальный rhythm в runtime.

## Что остаётся на Phase 3 / вне scope

- Более глубокая переработка `Телеграм` / `Настройки анализатора` как расширенных operational workspaces поверх текущих данных.
- Отдельный persisted hypothesis/domain layer, если он действительно понадобится позже.
- Более широкий consistency-pass для secondary detail pages за пределами touched surfaces.
