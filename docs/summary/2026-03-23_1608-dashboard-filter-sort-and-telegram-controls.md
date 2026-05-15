## Что сделано

Сделан точечный UX-pass по двум рабочим зонам: дашборду и Telegram digest controls.

### Дашборд

- Убрана лишняя описательная copy с overview-экрана.
- Добавлен фильтр по `Approach` без усложнения модели фильтров.
- Добавлена сортировка по клику на заголовки колонок:
  - по таблице подходов
  - по таблице кампаний
- Сортировка переключается `asc/desc` и показывает активное направление.
- Все цифры по-прежнему идут из existing historical aggregate service, без ad-hoc расчётов во view.

### Telegram

- Добавлен persisted runtime-setting для интервала digest:
  - `15`
  - `30`
  - `45`
  - `60` минут
- Интервал хранится в `system_settings` как `telegram_digest_interval_minutes`.
- Добавлен persisted timestamp последнего digest cycle:
  - `telegram_digest_last_cycle_at`
- Digest cycle теперь сам проверяет, прошёл ли нужный интервал.
- Добавлено ручное действие `Отправить сейчас` в Telegram admin surface.
- Внешний cron при этом не нужно перенастраивать при каждом изменении интервала.

## Что было сломано / ограничено

Нового runtime-багa в dashboard/Telegram code не обнаружено.

Отдельно подтверждено уже существующее ограничение репозитория:

- `npm run typecheck` падает не из-за этого шага, а из-за stale include pattern `.next/types/**/*.ts` в `tsconfig.json`
- после успешного `next build` эти пути всё равно отсутствуют, и `tsc --noEmit` валится на missing generated files

Этот шаг не менял `tsconfig` и не лечил эту старую проблему, чтобы не расползаться вне scope.

## Что исправлено

### Dashboard cleanup

- Верхний copy layer стал короче и операторским.
- Поддержан честный filter-by-approach через existing aggregate pipeline:
  - route читает `approachId`
  - aggregate service применяет фильтр на уровне исторических строк
- Добавлена стабильная сортировка:
  - `approachName`
  - `totalSpend`
  - `totalResults`
  - `costPerResult`
  - `outboundCtr`
  - `cplpv`
  - `campaignCount`
  - `signalCountAllTime`
  - для campaigns: аналогичный набор без лишнего усложнения

### Telegram interval + manual send

- Добавлена модель `SystemSetting`.
- Seed теперь закладывает дефолтный интервал `30` минут.
- Digest grouping использует актуальный интервал из настроек.
- Digest key теперь включает интервал, чтобы не было коллизий при смене cadence.
- `runTelegramDigestQueueCycle()`:
  - пропускает обычный auto-cycle, если интервал ещё не истёк
  - умеет `force` для ручного запуска
  - пишет timestamp последнего cycle
- В Telegram admin page добавлены:
  - селект интервала
  - кнопка ручного запуска
  - last cycle / next eligible cycle
  - короткие flash messages по результату действий

## Что ещё требует ручной проверки

Нужна локальная runtime-проверка в браузере:

1. Дашборд:
   - переключение фильтра по подходу
   - сортировка подходов
   - сортировка кампаний
   - сохранение query params при смене sort/filter

2. Telegram:
   - смена интервала на `15/30/45/60`
   - ручной `Отправить сейчас`
   - поведение cron endpoint, когда интервал ещё не истёк
   - live send при реальных `TELEGRAM_*` env

## Локальные шаги для проверки

1. Сгенерировать Prisma client:

```powershell
npm.cmd run prisma:generate
```

2. Запустить приложение локально с рабочей БД:

```powershell
npm.cmd run dev
```

3. Проверить дашборд:

- открыть `/`
- выбрать подход в фильтре
- кликнуть по заголовкам таблиц
- убедиться, что сортировка меняет направление и сохраняет активное состояние

4. Проверить Telegram UI:

- открыть `/admin/notifications`
- сменить интервал digest
- нажать `Отправить сейчас`
- проверить, что появился success flash message
- проверить recent digest windows и статусы

5. Проверить cron endpoint вручную:

```powershell
curl -X POST http://localhost:3000/api/notifications/digests/cycle -H "x-cron-secret: <CRON_SECRET>"
```

6. Проверить, что обычный cycle:

- не шлёт digest раньше configured interval
- а ручной запуск выполняется сразу

## Что сохранено без изменений

- existing historical aggregates architecture
- existing dashboard route
- AlertEvent / NotificationDigest / NotificationDelivery модель
- analyzer logic
- Telegram digest architecture
- current app shell / sidebar
