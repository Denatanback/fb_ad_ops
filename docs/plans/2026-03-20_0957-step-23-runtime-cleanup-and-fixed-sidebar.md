# План — Step 23 Runtime Cleanup And Fixed Sidebar

- Проверить shell, sidebar, topbar, dashboard и длинные admin/settings страницы на предмет runtime-level layout проблем.
- Если возможно, поднять локальный runtime/smoke pass для workspace/admin surfaces и зафиксировать, что реально удалось просмотреть.
- Исправить desktop shell так, чтобы sidebar оставался в viewport, имел внутренний scroll при необходимости, а основной scroll происходил в content area.
- Точечно дочистить spacing, alignment и awkward block sizing на admin/settings страницах без общего редизайна.
- Прогнать `next build` и оформить summary + changed-files отчёты.
