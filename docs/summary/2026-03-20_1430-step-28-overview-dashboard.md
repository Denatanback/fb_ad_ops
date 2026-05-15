# Итог — step 28

Сделан компактный overview dashboard на текущей workspace home page `/` поверх уже существующего historical aggregate service. Главная страница теперь показывает накопленный summary, подходы и campaign drill-down, а не только набор shortcut cards.

Что реализовано:
- dashboard использует `getHistoricalDashboardAggregates()` как единый source of truth для range-based accumulated statistics;
- добавлены compact controls по диапазону: `all time`, `7`, `14`, `30` дней и ручной `dateFrom/dateTo`;
- summary показывает только честные метрики, доступные из aggregate layer: `total spend`, `total results`, общий `CPA`, weighted `Outbound CTR`, weighted `CPLPV`, количество подходов и кампаний;
- section `Подходы` показывает spend, results, CPA, Outbound CTR, CPLPV, campaign count, signal count, target cost и target status;
- section `Кампании` показывает spend, results, CPA, Outbound CTR, CPLPV, budget mode context, target cost и signal count;
- добавлен компактный empty state для случая, когда исторических данных еще нет.

Проверка:
- `npm.cmd run build` прошел успешно;
- route `/` вошел в build output как основной overview dashboard;
- во время build остались уже существующие Prisma auth warnings/errors из-за локальных test DB credentials в этой среде, но они не заблокировали сборку.
