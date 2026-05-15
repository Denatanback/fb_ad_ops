## Scope

- Исправить общую причину, по которой не загружаются preview в галерее креативов и на детальной странице.
- Перестроить главный экран Analyzer в buyer-first режиме без изменения import/analyzer logic.
- Сохранить текущие routes, data flows, Prisma models и app shell.

## Assumptions

- Превью должны подтягиваться из уже существующих media reference fields, включая Google Drive-backed ссылки.
- Основной Analyzer route остаётся в текущем imports/analyzer разделе.
- Технические diagnostics остаются доступны, но не должны доминировать на первом экране.

## Preview Failure Investigation Targets

- `src/server/services/creatives.ts`
- `src/app/(workspace)/creatives/[creativeId]/page.tsx`
- `src/components/creatives/creative-gallery-card.tsx`
- `src/server/integrations/google-drive/service.ts`
- общая логика выбора renderable preview URL и fallback state

## Analyzer Simplification Strategy

- Использовать уже сохранённые analyzer results и import summaries, не переписывая analyzer execution.
- Построить главный экран вокруг:
  - текущего/выбранного import run
  - сильных результатов
  - слабых результатов
  - лучших метрик по подходам
- Историю импортов и upload flow оставить доступными, но понизить в визуальной иерархии.

## Blocks To Demote From Primary View

- storage path / storage key
- file hash / raw technical file metadata
- historical base counters
- delivery counters и digest diagnostics в подробном виде
- comparison groups и сырые diagnostics blocks

## Likely Files To Change

- `src/server/services/creatives.ts`
- `src/server/services/creative-media.ts`
- `src/components/creatives/creative-gallery-card.tsx`
- `src/app/(workspace)/creatives/[creativeId]/page.tsx`
- `src/app/(workspace)/imports/page.tsx`
- `src/server/services/import-runs.ts`
- `src/app/globals.css`

## Non-goals

- Не делать новый app-wide redesign.
- Не менять analyzer business rules, import pipeline или Telegram digest architecture.
- Не добавлять fake preview rendering или выдуманную persistence для funnels/analyzer.
