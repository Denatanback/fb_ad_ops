# Dashboard + Admin Discoverability — Summary

**Date:** 2026-03-20
**Full plan:** `docs/plans/2026-03-20_1600-step-24-dashboard-admin-discoverability.md`

---

## What Changed

### Admin sidebar discoverability

| File | Change |
|------|--------|
| `src/lib/navigation.ts` | Added `adminOnly` flag, `getWorkspaceNavigationGroupsForRole()`, shortened all nav descriptions |
| `src/components/layout/sidebar.tsx` | Accepts `userRole` prop, uses role-aware nav groups |
| `src/components/layout/app-shell.tsx` | Derives role from session, passes to Sidebar |

Admin items now appear in sidebar for admins: **Telegram**, **Analyzer**, **Google Drive** (under "Система" group with `admin` badge).

### Copy cleanup (PageHeader descriptions shortened)

| Page | Before | After |
|------|--------|-------|
| Dashboard | "Быстрый вход в ежедневные рабочие потоки без лишнего описательного шума." | "Ежедневные рабочие потоки и быстрые переходы." |
| Guide | "Короткая внутренняя справка, чтобы команда одинаково понимала..." | "Внутренняя справка по сущностям, статусам и рабочему потоку." |
| Approaches | "Рабочий список верхнеуровневых подходов..." (long) | "Каталог подходов, к которым привязываются креативы." |
| Landers | "Минимальный MVP-справочник лендингов..." (long) | "Справочник лендингов для привязки к запускам." |
| Creatives | "Практичный MVP-список креативов..." (long) | "Поиск и фильтры по подходу, статусу и меткам." |
| New Creative | "MVP-форма с обязательной связью..." | "Подход, статус, метки и медиа." |
| Bulk Upload | "Batch upload для новых creative originals..." | "Загрузка нескольких файлов в Google Drive с автоопределением типа." |
| Creative Detail | Long description with "Drive-backed media references" | "Статус, метки, медиа и запуски." |
| Edit Creative | Long description | "Поля креатива, статус, метки и медиа." |
| New Launch | Long description | "Setup, бюджет и начальные метрики." |
| Launch Detail | Long description | "Setup, бюджет и метрики." |
| Edit Launch | Long description | "Setup, бюджет и текущие метрики." |
| Notifications Admin | Long description | "Тест доставки в forum topics и проверка env-конфигурации." |
| Analyzer Rules Admin | Long description | "Global defaults и переопределения по approach или funnel." |
| Google Drive Admin | Long description with "MVP foundation" | "OAuth-подключение Google аккаунта и статус upload в My Drive." |

SectionCard descriptions also shortened on admin pages (notifications, analyzer-rules, google-drive).

## Build Status

Clean `next build` — zero errors.

## Known Follow-ups

- Dashboard could show live counts (creatives, queue items, active launches) once DB queries are acceptable on the landing page
- Mobile sidebar collapse / responsive nav
- Keyboard shortcuts for admin pages
