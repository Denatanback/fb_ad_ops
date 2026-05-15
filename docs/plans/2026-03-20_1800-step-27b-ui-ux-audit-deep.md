# Step 27b — Deep UI/UX Audit

**Date:** 2026-03-20
**Type:** Audit-only. No code changes.
**Lenses applied:**
- **web-design-guidelines** — visual hierarchy, whitespace, contrast, enclosure, typography scale, density, color as signal
- **shadcn/ui** — composable primitives, minimal chrome, sidebar/nav patterns, form structure, table patterns, page layout
- **vercel/react best practices** — App Router composition, server/client split, loading states, route organization

---

## 1. Overall Assessment

This product has strong fundamentals: correct server-component architecture, working design tokens, solid data model, good badge language for status signals. What it lacks is **a discipline about when to use visual enclosure and when not to**.

The result: every surface applies the same weight of border + background + padding + heading to every element — filters, tables, forms, help notes, navigation items. Nothing is primary. Nothing reads as background. The interface is uniform in a way that exhausts scanning.

The diagnosis from web-design-guidelines: **the app overuses Gestalt enclosure and underuses typography scale + whitespace as hierarchy tools**.

The diagnosis from shadcn reference: **the component model needs one more level of differentiation** — right now `SectionCard` is doing the work that should be split among three distinct primitives (page section, data container, annotation block).

The diagnosis from a vercel/App Router lens: **the architecture is already mostly right**. The most impactful improvements are structural UI, not code organization.

---

## 2. Main Structural Problems (ranked by scope)

### SP-1: Uniform enclosure destroys visual hierarchy

Every element gets the same treatment:
```
border: 1px solid var(--border-subtle)
border-radius: var(--radius-md)   /* 18px */
background: var(--background-panel)
padding: 16px
```

Applied to: navigation items, stat cards, filter panels, data tables, help notes, form panels, settings forms. When **everything is a box**, the eye has no entry point and no rest point.

**web-design-guidelines diagnosis**: Gestalt enclosure signals "this is a distinct unit". Using it on every element means every element claims equal importance. Reserve enclosure for items that need to be perceived as independent units (a data card for a key entity, a form for a critical action). Use whitespace and typography to group secondary elements.

### SP-2: Typography scale has too many levels inside the content frame

The app uses four heading levels inside a single page's content area:
- Topbar `h1` (navigation title)
- `.page-title` (`h2`) — PageHeader title
- `.section-card h3` — SectionCard title
- `.admin-form-panel h4` — form panel subheading

Four heading levels compete for attention. **web-design-guidelines**: a page should have one primary heading (the page title), one secondary level for major sections, and body text + labels for everything else. The `h4` inside a form panel inside a SectionCard is the fourth heading level in a hierarchy that can only visually support three.

### SP-3: SectionCard is the only card primitive — used for incompatible content types

`SectionCard` is used for:
1. Upload form (primary action area) → `/imports`
2. Help/annotation text → `/imports` ("Коротко по потоку"), `/admin/google-drive` ("Политика хранения")
3. Date filter controls → dashboard
4. Data table container → everywhere
5. Settings forms → `/admin/target-costs`, `/admin/analyzer-rules`
6. Nested inside another SectionCard → target-costs page

**shadcn reference**: shadcn uses `Card` sparingly — for a primary entity display (a resource card, a dashboard widget). Secondary info uses plain text with a visual separator or a subdued `Alert`. Settings forms use a flat section with a heading, not a Card wrapper. Filter controls have no Card wrapper — they sit in a `div` between the page heading and the table.

### SP-4: Stat cards describe themselves

Every stat card has `stat-copy` — a paragraph that re-explains the stat label:
```
Label: "Последние загрузки"
Value: 12
Copy: "Свежие import runs и их текущий статус."
```

The copy says what the label already says. This pattern repeats on every page. A stat card should be `label + value` only. Reserve a third line for cases where the value needs contextual unit data (e.g., a date range, an error message from a live status check).

**Exception where stat-copy IS useful**: The import run detail "Статус" stat card uses `stat-copy` to show `importRun.errorSummary` — actual dynamic data, not a static description. This is the right use.

### SP-5: Import run detail is an unordered diagnostic dump

825 lines, 14+ SectionCards. Order:
```
Page header → flash → back/rerun buttons → 4 stat cards → [metadata, parsing] → [diagnostics, historical base] → [route breakdown, skip/fail reasons] → [analyzer summary, reason codes] → [comparison groups, analyzer results] → [alert events, telegram delivery] → raw row errors → normalized rows preview
```

The sections most relevant to an operator checking a run:
1. **Did it succeed?** (stat card: Статус — already at top ✓)
2. **What alerts were generated?** (Alert events — section 11 of 14 ✗)
3. **Was Telegram delivery confirmed?** (Telegram delivery — section 12 of 14 ✗)

The two most operationally relevant sections are at the bottom. Pipeline internals (comparison groups, analyzer results, historical base, reason codes) are in the middle. This is inverted from what an operator needs.

### SP-6: Admin pages carry content that belongs elsewhere

**Target costs admin page**: ends with "Historical base" and "Топ подходов по spend" sections — cumulative spend, campaign count, approach summaries. This is dashboard content on a settings page. An operator navigating here wants to set a target cost, not review their historical performance.

**Google Drive admin page**: the second SectionCard is "Политика хранения" — a policy documentation block. The third SectionCard is "Что проверить в Google Cloud" — a setup checklist. Both are developer/setup documentation inside an operational settings page.

**Imports page**: "Коротко по потоку" shows `uploadsRoot`, backend path description, and API route. This is system architecture documentation, not operational UI.

### SP-7: Sidebar navigation styled as content cards

Sidebar nav items:
```css
.nav-item {
  padding: 11px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);     /* 18px */
  background: var(--background-muted);
}
```

18px border-radius + fill background + border makes nav items indistinguishable from content cards. **shadcn reference**: sidebar nav items are plain links with `h-8 flex items-center gap-2 rounded-md px-2 text-sm font-medium`. Active state uses a subtle background or left accent bar. No border, no fill.

Current sidebar pill badges (`pill--ready`, `pill--pending`) on nav items show labels like "обзор", "план", "live", "база" — taxonomy labels with no operational value. They add color noise without signal.

### SP-8: Double/triple page title

Every page reads its own title three times:
1. Sidebar: active item highlighted ("Импорты")
2. Topbar `h1`: "Импорты" (from navigation config)
3. PageHeader `h2`: "Импорты статистики" (slightly different phrasing)

The topbar serves no information function that the sidebar active state and in-page heading don't already serve. It does correctly show the user chip and actions (theme, sign out), but the title/description in the topbar is redundant.

### SP-9: Creative detail exposes all metadata fields regardless of population

The "Медиа и внешнее хранение" meta-list renders 10 URL fields. For a typical creative with only Google Drive backing, 7 of those fields show "Не указан". The meta-list becomes a list of absences rather than a list of information.

**shadcn reference**: Shadcn detail views show only populated fields. Empty fields are either hidden or shown behind a disclosure.

### SP-10: Gallery lacks the controls that make it a usable media library

The gallery page has no filter bar, no search, no total count, and no prominent way to filter by approach or status. The mode switcher (Список / Галерея) is two plain buttons with no clear active state — `gallery-mode-bar__active` only disables pointer-events, doesn't add visual differentiation.

---

## 3. Target UI Direction

Apply these principles in order of impact:

### P1: Differentiate enclosure levels

Three levels — not one:

| Level | Visual treatment | Use case |
|---|---|---|
| **Working area** | No border, no background. Just content (table, form, grid) with a plain `h3` section heading above it | Primary task area on a page |
| **Panel** | Subtle background (`--background-muted`), no border OR very faint border, 14px padding | Secondary context, filters, stats strip |
| **Card** | Full border + stronger background + 16px padding | A distinct, self-contained entity (an approach widget, a config entry) |

Today everything is at Card level. The goal: most of the content on any page should be at Working area or Panel level. Card is reserved for distinct entity units.

### P2: Reduce heading levels to three per page maximum

- **Level 1**: Page title — one per page, largest. In-page `h2` or topbar `h1` (pick one).
- **Level 2**: Section heading — `h3` without border or card chrome, with a visual separator or whitespace above.
- **Level 3**: Field label / table column header / inline label — always at body weight.

Remove `h4` from form panels. Form group labels should be field labels (`label`), not subheadings.

### P3: Stat cards → compact summary strip

Replace `stats-inline` (bordered cards with paragraphs) with a horizontal strip of `label: value` pairs:

```
[ Статус: Готово ]  [ Строк: 1 240 ]  [ Alerts: 3 ]  [ Отправлено: 3 ]
```

No border per item. The strip itself has subtle background. Values in slightly larger/bolder type. No `stat-copy` paragraphs. This is what a density-optimized operational tool looks like.

### P4: Sidebar → link list, not card list

Shrink nav items to `padding: 8px 10px`, remove border and background fill. Active state: accent-colored left border (3px) + subtle background. This is the shadcn sidebar pattern and every mature ops tool (Linear, Vercel dashboard, Retool).

### P5: Filter controls → flat filter bar

Filters should not be wrapped in a SectionCard with a title and description. They belong in a single `<div className="filter-bar">` directly below the page heading. The filter bar is part of the page chrome — not a named content section.

### P6: Import run detail → three-tier priority

Tier 1 (always visible): status header strip + alert events summary
Tier 2 (below): delivery tracking + route breakdown
Tier 3 (collapsible or secondary): pipeline diagnostics (comparison groups, analyzer results, raw rows, normalized preview, historical base, reason codes)

---

## 4. Page-by-Page Findings

### Workspace Shell

**Topbar** (`src/components/layout/topbar.tsx`)

Positives:
- User chip with role badge is clean
- Theme toggle placement is correct

Problems:
- `h1` inside topbar repeats the sidebar active item and the in-page PageHeader title. The topbar title renders from `getWorkspaceNavigationItem(pathname)?.title` — the same item highlighted in the sidebar. Zero additional information.
- The `topbar-heading p` description ("Обзор и быстрые переходы.") is copied from navigation config and adds nothing to the current context.

Recommendation: Remove title/description from topbar. Let topbar carry: breadcrumb (for nested pages like `/imports/[id]`) | user chip | actions only.

**Sidebar** (`src/components/layout/sidebar.tsx`, `src/lib/navigation.ts`)

Positives:
- Three-group structure (Операции / Библиотека / Система) is correct
- Role-based filtering is correctly implemented

Problems:
- Nav items look like content cards. `border-radius: 18px` + `background-muted` fill = feels like sidebar contains cards, not navigation links
- Pill badges inside nav items: "обзор", "план", "live", "база", "core", "url", "csv", "help", "admin" — these describe the item type, not its operational state. They add visual noise with no information value
- English item names mixed with Russian: "Queue", "Active", "Scaling", "Creatives", "Approaches", "Landers" vs "Импорты", "Гид"
- Nav item description text is not shown in the sidebar (correctly — only title and badge) but the badge slot is wasted on taxonomy labels

**shadcn reference for sidebar nav items:**
```tsx
// shadcn pattern
<a className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
  <span>Импорты</span>
</a>
// Active:
<a className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium bg-accent text-accent-foreground">
```

No border. No fill by default. No pill. Active = subtle fill + colored text.

### Dashboard (/)

**Positives:**
- Date preset filter row (7d/14d/30d/Все время) is good interaction design
- Approach cards with target cost status tones (good/neutral/warning/muted) are effective
- Campaign table with correct columns is the right primitive for this data

**Problems:**

1. **Filter wrapped in SectionCard with title + description**
   ```jsx
   <SectionCard title="Срез" description="Компактный фильтр по времени...">
     <div className="dashboard-controls">
       <div className="dashboard-preset-row">...
   ```
   The date filter is part of the page chrome. It shouldn't be a named section with a card border. It belongs directly below the page heading, as a filter bar.

2. **7 stat cards, all with `stat-copy` paragraphs**
   "Подходы: 3 — Видны в historical overview" — the `stat-copy` here is developer-speak, not operator context.
   "Кампании: 12 — Готовы для drill-down" — same.
   The description paragraphs below Расход, Результаты, CPA, CTR, CPLPV add no value to an operator who runs these numbers daily.

3. **Approach card action button goes to wrong destination**
   Each approach card has "Открыть подходы" → `/approaches`. This goes to the full approaches list, not to that specific approach's creatives or detail. An action inside an approach card MUST be scoped to that approach. This is a functional UX error, not just a cosmetic issue.

4. **7-column campaign table is wide but the most important columns are buried**
   Columns: Кампания | Подход | Расход | Результаты | Цена результата | Outbound CTR | CPLPV | Бюджет | Целевая стоимость | Сигналы — that's 10 columns. On any realistic viewport this requires horizontal scroll. The most actionable column (Целевая стоимость with tone status) is second from last.

5. **SectionCard title descriptions are too verbose**
   "Главный слой обзора: накопленный расход, результат, контекст target cost и сигналы по каждому подходу."
   This explains what a user already sees. Cut or radically shorten.

### Imports (/imports)

**Positives:**
- Upload form on the left, info on the right: correct structural choice
- Import runs table columns (Файл, Статус, Размер, Rows, Alerts, Получен) are appropriate
- Status pill tone (Готово=green, Ошибка=red, others=gray) is correct

**Problems:**

1. **"Коротко по потоку" panel** (right side, next to upload form) shows:
   - Storage path (`uploadsRoot`)
   - Pipeline stages as text: "Upload → ImportRun → parsing → normalization → analyzer → alerts"
   - API endpoint `/api/imports/upload`
   This is developer documentation. An operator uploading a file does not need to know what the backend path is. Move to `/guide` or remove.

2. **Eyebrow "Imports" in English** on a Russian-first page.

3. **4 stat cards all with `stat-copy`** that re-describe labels. The "Alerts" card: "Суммарное число сохранённых сигналов по текущей выборке import runs." — the label "Alerts" already communicates this to anyone who uses the system.

### Import Run Detail (/imports/[id])

The most problematic page in the product. Full content audit:

**Section order (current):**
```
1. Метаданные файла           ← reference data, rarely needed
2. Сводка parsing/normalization ← useful if there are parse errors
3. Operational diagnostics     ← 4 MORE stat cards inside a section card
4. Historical base             ← system-level data, not operational
5. Route breakdown             ← useful for debugging delivery issues
6. Skip/fail reasons           ← useful for debugging delivery issues
7. Analyzer summary            ← mostly duplicates stat cards above
8. Reason codes                ← reference
9. Comparison groups           ← pipeline detail
10. Analyzer results           ← pipeline detail
11. Alert events               ← *** MOST IMPORTANT SECTION ***
12. Telegram delivery tracking  ← *** MOST IMPORTANT SECTION ***
13. Raw row errors             ← reference for parse debugging
14. Normalized rows preview    ← reference for naming debugging
```

**Section order (recommended):**
```
Tier 1 — always visible:
1. Alert events (moved to top)
2. Telegram delivery tracking (moved to top)
3. Route breakdown

Tier 2 — secondary (visible but below fold):
4. Operational summary (collapsed stat strip: rows, analyzer results, alert count, delivery count)
5. Skip/fail reasons
6. Analyzer summary + reason codes (merged)

Tier 3 — collapsible diagnostics:
7. Comparison groups + Analyzer results
8. Metadata file
9. Historical base
10. Normalized rows preview
11. Raw row errors
```

**Additional problems on this page:**

- "Operational diagnostics" section contains ANOTHER `stats-inline` (4 more stat cards) inside a SectionCard that itself follows 4 stat cards above. The user sees 8 stat cards in the first third of the page. Stat card inflation.
- The 4 stat cards at top are actually the right choice for quick scanning — but their `stat-copy` texts should use the dynamic data they already have (e.g. "Статус" card correctly uses `importRun.errorSummary`). The other three have static descriptions.
- "Historical base" section (how many completed runs exist system-wide, what was the reportDate range) is irrelevant to the question "what happened in this specific run?"
- "Analyzer summary" section (stage, groups count, results count, alert count) duplicates the top stat cards exactly — it adds no new information.

### Admin / Analyzer Rules (/admin/analyzer-rules)

**Positives:**
- Three-tier rule hierarchy (global → approach → funnel) is correct structure
- Stats at top (hierarchy, global rules, override count) give correct context

**Problems:**

1. **Form nesting depth is 5 levels:**
   `SectionCard` → `form` → `admin-panels-grid` → `admin-form-panel` → `field`
   shadcn forms: `section` → `form` → `field group` → `field`
   The `admin-form-panel` wrapper adds a border + background + padding + header + description (h4 + p) for each logical group. This creates visible boxes around every field group, making the form feel like a nested interface rather than a flat form.

2. **Explanatory signal-lists BEFORE the forms**
   The page starts with: stats → SectionCard "Действующие правила" (list of all effective rules) → SectionCard "Что настраивается" (explanation of each rule type). Both of these explanatory sections come BEFORE the forms. An admin navigating here to adjust a threshold wants to get to the form immediately.

3. **`field__hint` texts contain English developer notes:**
   "Destination topic в Telegram. Manages how the alert is classified and routed downstream."
   This is documentation. A hint should be one short Russian phrase max.

4. **Compound class names on form card:**
   ```
   className="section-card section-card--muted section-card--compact admin-form-card"
   ```
   Four modifiers on one element. The CSS component model is under strain — it's being bent to cover use cases it wasn't designed for.

### Admin / Notifications (/admin/notifications)

**Positives:**
- Stat cards (enabled, base config, topic count) are the right leading context
- Topic routes list with configured/not status is clean

**Problems:**

1. **Backtick code references in Russian operator text:**
   - "Флаг берется из `TELEGRAM_ALERTS_ENABLED`."
   - "Нужны `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`"
   - "Нужно только для `needs_review`"
   These code references belong in a developer setup guide, not in a rendered stat card visible to all admins.

2. **Two-panel test form uses conditional logic that isn't reflected in the layout:** The "Код причины" select is only relevant when `needs_review` is selected as topic. But both panels always show. No dynamic hiding. This is a minor UX issue but creates "why am I filling this out?" confusion.

3. **SectionCard title description is too verbose:**
   "Один служебный сигнал в выбранную тему." (for the test form)
   The card title "Тестовая отправка" already explains what it is.

### Admin / Target Costs (/admin/target-costs)

**Positives:**
- Global → approach → funnel cascade structure is logically correct
- `TargetCostForm` component is reusable
- The `admin-inline-meta` pill strip (scope label + current value) is a useful context indicator

**Problems:**

1. **Bottom section "Historical base" and "Топ подходов по spend"** are completely wrong content for a settings page. They show cumulative spend, import counts, campaign counts, and top-5 approaches by spend. This is dashboard data. An operator on this settings page wants to set target costs, not review performance summaries. These two SectionCards should be removed from this page.

2. **SectionCard nested inside SectionCard:**
   ```
   SectionCard "Overrides по подходам"
     └── SectionCard "Сохранённые overrides по подходам"
   ```
   The inner SectionCard has the same visual treatment as the outer one. This creates card-in-card chrome. Use a plain heading + list instead of a nested SectionCard.

3. **Form card compound class:**
   ```
   className="section-card section-card--muted section-card--compact admin-form-card"
   ```
   Same issue as analyzer-rules.

### Admin / Google Drive (/admin/google-drive)

**Positives:**
- Connection status and account details in a `details-grid` (dl) is the right primitive for structured key-value pairs
- "Переподключить" / "Подключить" button correctly changes based on state
- Error message reuse via `flash-message--error` is correct

**Problems:**

1. **Two explanatory SectionCards that have no operational purpose:**
   - "Политика хранения" — 3 bullet points explaining why originals go to Drive, not app server. This is architectural documentation.
   - "Что проверить в Google Cloud" — 3 bullet points about OAuth client setup, redirect URI, folder ID. This is setup documentation.
   Both belong in the Guide page or an inline collapsible "Справка по настройке" section, not as primary content visible to all admins every time they visit this page.

2. **Stat card backtick code refs:**
   "Нужны `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и корректный redirect URI."
   "Для загрузки в My Drive можно задать `GOOGLE_DRIVE_FOLDER_ID`."

3. **The status SectionCard description says** "Текущее состояние OAuth и связанного аккаунта." — redundant with the title "Статус подключения".

### Creatives List (/creatives)

**Positives:**
- Table columns are appropriate (Креатив, Подход, Статус, Метки, Запуски, Обновлён, Actions)
- Filter components (search, approach, status, label) are correctly chosen

**Problems:**

1. **Left panel of hero-grid** (stats panel) contains:
   - `section-card__header` with h3 "Операционный список" + description paragraph
   - Two stat cards (Найдено креативов, Доступно подходов)
   This h3 describes the entire page. It's redundant with the page heading. The stat panel should just show the numbers.

2. **Actions panel mixes three different action types** in a single `stack`:
   - "Создать креатив" (primary action: create a new entity)
   - "Загрузить batch" (secondary action: bulk create)
   - "Галерея" (mode switch: change view)
   - "Открыть подходы" (navigation: go to another section)
   These should be visually differentiated. Mode switches belong in the page heading area, not in the actions panel.

3. **Filter controls wrapped in SectionCard.** The filter SectionCard has title "Фильтры" and description "Поиск и быстрые срезы без перегруженного интерфейса." — a description about having no overloaded interface, on an interface that has an overloaded filter panel.

4. **Creative list shows approaches page has the "К креативам" link** — but on the creatives page itself, there's no reverse link to filter by approach. The approach filter exists but not surfaced prominently.

### Creatives Gallery (/creatives/gallery)

**Positives:**
- Three-level grouping (status → approach → media type) is structurally correct for this data
- 16:9 card aspect ratio with `object-fit: cover` is correct for media preview
- Lazy-loading images via `loading="lazy"` is correct

**Problems:**

1. **No filter/search bar.** An operator with 50+ creatives across 10 approaches and 4 statuses cannot narrow the gallery view. A gallery without filters is a view-only decoration.

2. **Mode switcher lacks active state visual differentiation.** `gallery-mode-bar__active` sets `cursor: default; pointer-events: none` but no visual distinction. The active mode button looks identical to the inactive mode button. Apply `button--primary` to the active mode, `button--secondary` to the inactive.

3. **No total count displayed.** The gallery shows creatives grouped by status but doesn't tell you how many total are shown. The list page shows "Найдено: 43" — the gallery shows nothing.

4. **Single-item approach blocks** — if an approach has 1 video and 1 image, you get:
   ```
   [Approach Block]
     Видео · 1
     [ card ]
     Изображения · 1
     [ card ]
   ```
   Two separate type sections with one card each. Very fragmented. Consider merging type sections when count ≤ 2 per type.

5. **Gallery mode switcher is inside the content frame**, not at the heading level. It should be part of the page header controls (right-aligned), making it clear it's a view option, not a primary action.

### Creative Detail (/creatives/[id])

**Positives:**
- Hero grid (status+labels+links left, timestamps right) is the right split for a detail page
- Launch history table is appropriately structured

**Problems:**

1. **PageHeader eyebrow is "Creative details" (English)** on a Russian-first page.

2. **Media section opens with 3 stat cards before showing the actual media:**
   ```
   [Хранение: Google Drive-backed]
   [Preview: Готово к просмотру]
   [Original: Original через Drive]
   ```
   These three status labels add no value — the presence of a thumbnail image, the presence of action buttons, and the media-summary-grid itself already communicate this. Remove these stat cards. Show the image first.

3. **Meta-list renders all 10 URL fields regardless of population:**
   For a Drive-backed creative: Original/source = Не указан | Asset link = Не указан | Preview link = Не указан | Thumbnail = https://... | Drive file ID = abc123 | Drive view link = https://... | Drive download link = Не указан | Имя файла = video.mp4 | MIME = video/mp4 | Размер = ...
   7 of 10 fields are populated. This is a good example, but for many creatives it'll be 2/10 populated and 8 "Не указан". Filter to populated fields only.

4. **"Обновить media links" as a primary button** (`button--primary`) on the media section makes it look like the main call-to-action, which overshadows "Создать запуск" in the hero section.

---

## 5. Recommended Shared UI System / Layout Language

The current system has ~60 CSS utility classes for layout. The following 10 primitives, replacing the current "blocks everywhere" model, would cover 90% of what the app needs.

### Primitive 1: `page-shell`
The top-of-page zone: one `h2` (or `h1` if topbar title is removed) + right-aligned action buttons. No border, no background. Pure typography + spacing.

```
[h2: Импорты статистики]                    [+ Загрузить CSV]
```

Used on: every page. Replaces: `PageHeader` component + topbar heading combination.

### Primitive 2: `summary-strip`
Horizontal row of `label: value` pairs. Subtle background. No individual borders per item. No paragraph descriptions.

```
[ Импортов: 12 ]  [ В работе: 1 ]  [ Ошибки: 0 ]  [ Alerts: 47 ]
```

Used on: all pages that currently have `stats-inline` with stat cards.
Difference from current: no individual card borders, no `stat-copy` paragraphs.

### Primitive 3: `filter-bar`
Flat horizontal row: filter controls (search input, select dropdowns, clear link) left-aligned. Optional mode switch right-aligned. No card chrome.

Used on: imports list, creatives list, creatives gallery, dashboard.
Replaces: SectionCard wrapping filter controls.

### Primitive 4: `section-heading`
Plain `h3` with optional count/badge right-aligned. Standard `margin-bottom: 12px`. No border, no background. Separates content areas with typography instead of boxes.

```
Последние import runs  ·  12
```

Used on: all current SectionCard titles that wrap tables or primary working content.
Replaces: SectionCard header in those contexts.

### Primitive 5: `data-panel`
Full-width working area for tables, gallery grids, primary forms. No outer border. Content inherits the page background. Internal elements may have subtle borders (table rows).

Used on: data tables, gallery, primary forms.
Replaces: SectionCard wrapping data tables.

### Primitive 6: `annotation-block`
Subdued background + 12px padding + no border (or very faint). For secondary reference info: help notes, system status context, setup checklists. Visually recessed relative to primary content.

```css
.annotation-block {
  background: var(--background-muted);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text-secondary);
  font-size: 0.84rem;
}
```

Used on: "Политика хранения" in Google Drive, "Что проверить" in Google Drive, any explanatory content.
Replaces: SectionCard used for help/reference content.

### Primitive 7: `settings-section`
Flat settings area: `h3` heading + optional subtitle + fields below. Fields use standard `field` (label + input) layout. No card wrapper around field groups. Groups separated by a `<hr>` or 24px gap.

```
h3: Маршрутизация
  [Label] Тема    [select: needs_review]
  [Label] Severity  [select: warning]

──────────────────────

h3: Пороги
  [Label] Расход  [input: 50]
  [Label] Макс. результатов  [input: 0]
```

Used on: all admin settings forms.
Replaces: admin-form-panel with h4 + p inside admin-panels-grid.

### Primitive 8: `entity-card`
Full border + stronger background + 16px padding. Reserved for distinct, self-contained entity widgets (an approach widget on the dashboard, a target cost config entry). NOT used for wrapping tables, filters, or help text.

Used on: dashboard approach cards, target cost form entries.
Current usage is already approximately correct here.

### Primitive 9: `detail-sidebar`
Narrow right column (260–280px) on detail pages. Holds: timestamps, status, metadata, audit trail. Main content is a full-width left column.

Used on: creative detail, import run detail, launch detail.
The hero-grid pattern already approximates this but should be more consistent.

### Primitive 10: `status-strip`
For import run detail and similar diagnostic pages: a compact single-row strip showing key outcomes (Статус: Готово · Alerts: 3 · Отправлено: 3 · Ошибок: 0). High-density, no card chrome.

---

## 6. Prioritized Action Plan

### Critical — structural correctness failures

| ID | Problem | File(s) | Impact |
|---|---|---|---|
| C1 | Import run detail section order: alerts/delivery should be first, diagnostics last | `imports/[importRunId]/page.tsx` | Makes most-used diagnostic page actually useful |
| C2 | Dashboard approach card "Открыть подходы" links to list, not specific approach | `overview-dashboard.tsx` | Functional UX error — button scope mismatch |
| C3 | Remove stat-copy paragraphs from all stat cards (keep only where value is dynamic, e.g., errorSummary) | All pages | Immediate noise reduction on every screen |
| C4 | Remove "Historical base" + "Топ подходов" from target-costs admin | `admin/target-costs/page.tsx` | Wrong content on settings page |
| C5 | Remove "Коротко по потоку" from imports page | `imports/page.tsx` | Developer docs on operator screen |
| C6 | Remove "Политика хранения" + "Что проверить" from Google Drive admin | `admin/google-drive/page.tsx` | Developer docs on operator screen |

### Important — structural clarity improvements

| ID | Problem | File(s) | Impact |
|---|---|---|---|
| I1 | Sidebar nav items: remove card chrome (border + fill). Active = accent left bar + subtle background | `sidebar.tsx` + `globals.css` | Navigation vs content confusion resolved |
| I2 | Sidebar nav badges: remove taxonomy labels or replace with operational counts | `navigation.ts` + `sidebar.tsx` | Badge space used meaningfully |
| I3 | Filter controls: remove SectionCard wrapper on dashboard, imports, creatives | 3 page files | Faster scanning, filter bar at correct hierarchy |
| I4 | Gallery: add filter bar (approach, status) + total count | `creatives/gallery/page.tsx` | Makes gallery actually usable |
| I5 | Gallery mode switcher: primary/secondary button visual differentiation + move to page header level | `creatives/gallery/page.tsx`, `creatives/page.tsx` | Mode switch clarity |
| I6 | Creative detail: show only populated metadata fields | `creatives/[creativeId]/page.tsx` | Removes 7× "Не указан" visual noise |
| I7 | Creative detail: remove 3 descriptive stat cards (Хранение/Preview/Original) before media preview | `creatives/[creativeId]/page.tsx` | Show media first |
| I8 | Translate all PageHeader eyebrow labels to Russian | All page files | Language consistency |
| I9 | Remove backtick code refs from Russian operator text (stat cards, field hints) | All admin pages | Operator-appropriate language |
| I10 | Analyzer rules page: move explanatory signal-lists below forms (forms first) | `admin/analyzer-rules/page.tsx` | Action-first for settings pages |
| I11 | Topbar: remove title/description repetition; keep user chip + theme + signout only | `topbar.tsx` | Eliminates triple-title problem |
| I12 | Nested SectionCard in target-costs: replace inner SectionCard with section-heading + stack | `admin/target-costs/page.tsx` | Remove card-in-card chrome |

### Nice-to-have — polish and consistency

| ID | Problem | Files | Impact |
|---|---|---|---|
| N1 | Russify primary nav item names (Queue → Очередь, Active → Активные, Scaling → Масштабирование, Creatives → Креативы) | `navigation.ts` | Language consistency |
| N2 | Shorten empty state texts — remove feature checklist paragraphs | Multiple | Less reading noise |
| N3 | Dashboard: make campaign table columns prioritized (Кампания, Расход, CPA, Target status first) | `overview-dashboard.tsx` | Key column not buried at right |
| N4 | Approaches page: stats in left hero panel should drop h3 "Текущий справочник" (redundant with page title) | `approaches/page.tsx` | Redundant heading |
| N5 | Import run detail: merge "Analyzer summary" section into top stat cards (it duplicates them) | `imports/[importRunId]/page.tsx` | Remove duplicate content |
| N6 | Creative list: separate mode switch from action buttons visually | `creatives/page.tsx` | Intent clarity |
| N7 | Stats strip (summary-strip) as a new CSS primitive replacing stats-inline + stat-cards | `globals.css` | Better density |
| N8 | Add `loading.tsx` and `error.tsx` to heavy pages (import run detail, dashboard) | Route directories | App Router best practice |
| N9 | Form field hints: cut to 1 short sentence maximum; remove developer explanations | All admin forms | Cleaner forms |

---

## 7. Suggested Execution Sequence

### Pass A — Content removal (zero structural risk)
**Delivers**: immediate reduction in noise on 4 pages. No new components.
- C3: Remove `stat-copy` paragraphs everywhere (keep only dynamic ones)
- C4: Remove Historical base + Топ подходов from target-costs admin
- C5: Remove "Коротко по потоку" from imports
- C6: Remove "Политика хранения" + "Что проверить" from Google Drive admin
- I8: Translate eyebrow labels to Russian
- I9: Remove backtick code refs from Russian text
- N2: Shorten empty state texts
- N9: Cut verbose field hints

### Pass B — Import run detail restructure
**Delivers**: makes the most-used diagnostic page actually useful.
- C1: Reorder sections — alerts/delivery first, diagnostics secondary
- N5: Remove duplicate Analyzer summary section (merge into top stat cards)
- (Optional) Introduce collapsible sections for Tier 3 content

### Pass C — Critical functional fix + navigation
**Delivers**: fixes functional UX error, lighter sidebar.
- C2: Fix dashboard approach card link to specific approach
- I1: Sidebar nav item chrome removal
- I2: Sidebar badge content improvement
- I11: Topbar title/description removal

### Pass D — Filter system cleanup
**Delivers**: faster page scanning, filter bar as page chrome (not content).
- I3: Remove SectionCard from filter controls on dashboard, imports, creatives
- I4: Add filter bar to gallery (approach, status select)
- I5: Gallery mode switcher visual differentiation + location
- N6: Separate mode switch from action buttons on creatives list

### Pass E — Detail pages cleanup
**Delivers**: detail pages show content, not absence of content.
- I6: Creative detail — hide empty metadata fields
- I7: Creative detail — remove 3 descriptive stat cards before media
- I10: Analyzer rules — forms before explanatory sections
- I12: Target costs — remove nested SectionCard
- N4: Approaches page — remove redundant h3 in stats panel

### Pass F — New layout primitives (CSS system)
**Delivers**: formal replacement of "blocks everywhere" with differentiated primitives.
- N7: Introduce `summary-strip`, `filter-bar`, `section-heading`, `annotation-block`, `settings-section`, `data-panel` CSS primitives
- Migrate pages progressively to new primitives
- N8: Add `loading.tsx` and `error.tsx` to heavy routes

---

## 8. Files Most Responsible for Current UI Shape

These files are the primary sources of the structural patterns being audited. Changing these will cascade improvement across the entire product.

| File | Role | Why it matters |
|---|---|---|
| `src/app/globals.css` | CSS system | Defines every layout primitive. Stat cards, section cards, hero grid, stats-inline. A new set of primitives (summary-strip, filter-bar, annotation-block) would be added here. |
| `src/components/workspace/section-card.tsx` | Universal container | Used everywhere as a one-size-fits-all card. New specialized primitives would replace many of its use cases. |
| `src/components/workspace/page-header.tsx` | Page title triple | The eyebrow + h2 + description combination. Should be simplified or replaced by a single title-bar pattern. |
| `src/components/layout/sidebar.tsx` | Navigation shell | Nav item rendering. The card-style nav items come from here + globals.css `.nav-item` class. |
| `src/components/layout/topbar.tsx` | Redundant title | Repeats the page title from navigation config. Removing title/description here would solve the triple-title problem. |
| `src/lib/navigation.ts` | Nav content | Badge labels (taxonomy strings) and English item names come from here. Operational counts would need to be injected from page-level data fetching. |
| `src/components/dashboard/overview-dashboard.tsx` | Dashboard layout | Sets the dashboard pattern: SectionCard for everything. Most impactful single component to refactor for dashboard visual quality. |
| `src/app/(workspace)/imports/[importRunId]/page.tsx` | Worst page | 825 lines, 14 sections in wrong order. The most important diagnostic page in the product. Restructuring this page would have the highest per-page operator impact. |
| `src/app/(workspace)/admin/target-costs/page.tsx` | Settings + content mix | Contains both settings forms and dashboard data. Removing dashboard sections would immediately clarify the page's purpose. |
| `src/app/(workspace)/admin/analyzer-rules/page.tsx` | Deep form nesting | Most complex admin form. The 5-level form nesting (SectionCard → form → grid → panel → field) comes from here and `admin-form-panel` CSS pattern. |
