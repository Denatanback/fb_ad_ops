# Changed Files — Step 23 Runtime Cleanup And Fixed Sidebar

- `src/components/layout/app-shell.tsx` — добавлен основной body-wrapper внутри shell для более предсказуемого scroll/layout поведения.
- `src/components/layout/sidebar.tsx` — навигация вынесена в отдельный scrollable контейнер `sidebar__nav`, сохранён compact sidebar pattern.
- `src/components/layout/topbar.tsx` — нормализован RU copy и стабилизирован topbar header/actions layout.
- `src/app/globals.css` — исправлен desktop shell scroll model, добавлен fixed-height sidebar behavior, внутренний sidebar scroll, и точечные runtime spacing/alignment правки для shell/admin surfaces.
- `docs/plans/2026-03-20_0957-step-23-runtime-cleanup-and-fixed-sidebar.md` — план шага.
- `docs/summary/2026-03-20_0957-step-23-runtime-cleanup-and-fixed-sidebar.md` — итог шага.
