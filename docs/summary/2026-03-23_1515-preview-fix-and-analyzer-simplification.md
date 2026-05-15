## What Was Checked

- Общий creative preview path в:
  - `src/components/creatives/creative-gallery-card.tsx`
  - `src/app/(workspace)/creatives/[creativeId]/page.tsx`
  - `src/server/services/creatives.ts`
  - `src/app/(workspace)/creatives/actions.ts`
  - `src/server/integrations/google-drive/service.ts`
- Текущая структура Analyzer main screen в:
  - `src/app/(workspace)/imports/page.tsx`
  - `src/server/services/import-runs.ts`
  - существующие persisted analyzer results / alert data

## Actual Cause Of Preview Failure

- Gallery и creative detail жёстко пытались рендерить preview только как `<img>`.
- Для части Drive-backed медиа `previewUrl` мог указывать на `webViewLink`, то есть на HTML-страницу просмотра Google Drive, а не на честный renderable media asset.
- Общий preview path почти не использовал `driveDownloadUrl` и другие безопасные fallback links.
- В результате и gallery, и detail били в один и тот же узкий shared failure point: плохой выбор preview source + неверное предположение, что любой preview всегда картинка.

## What Was Fixed

- Добавлен общий preview resolver в `src/server/services/creative-media.ts`.
- Добавлен маленький shared preview component в `src/components/creatives/creative-preview.tsx`, который:
  - умеет честно рендерить image или video preview
  - пробует следующий источник, если предыдущий не загрузился
  - показывает honest fallback state, если renderable preview действительно нет
- Gallery теперь использует общий resolver вместо прямого `thumbnailUrl/previewUrl/assetUrl`.
- Creative detail page теперь использует тот же shared preview path.
- В `src/app/(workspace)/creatives/actions.ts` исправлен порядок fallback после Drive upload:
  - `previewUrl` теперь предпочитает `webContentLink`, а не `webViewLink`

## How Analyzer Hierarchy Changed

- Главный экран `Analyzer` на `/imports` теперь buyer-first:
  - сверху selector текущего CSV/import
  - затем короткий operational summary
  - затем:
    - `Хорошие кампании / адсеты / креативы`
    - `Слабые кампании / адсеты / креативы`
    - `Лучшие метрики по подходу`
- CSV upload и import history сохранены, но опущены ниже.
- Технические детали не удалены, а демотированы:
  - основной вход в них теперь через `Тех. детали` / import detail route

## What Technical Data Remains Available And Where

- Полные diagnostics, file metadata, digest/delivery counters, hash и прочие тех. блоки остаются на:
  - `src/app/(workspace)/imports/[importRunId]/page.tsx`
- Main Analyzer screen теперь показывает только то, что полезно media buyer на первом экране.

## Manual Browser Checks Still Needed

- Проверить живьём gallery и creative detail на текущих Drive-backed и non-Drive creatives:
  - image previews
  - video previews
  - fallback state без preview
- Проверить main Analyzer page на non-empty import run:
  - перенос длинных названий кампаний/адсетов
  - читаемость сильных/слабых таблиц
  - selector текущего CSV

## Validation Results

- `npm.cmd run build` — passed
- `npm.cmd run typecheck` — passed

Примечание:
- первый `typecheck` упал из-за stale `.next/types`, после `build` повторный `typecheck` прошёл чисто
