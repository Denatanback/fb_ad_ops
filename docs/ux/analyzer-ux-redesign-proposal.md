# Analyzer UX Redesign Proposal

**Date:** 2026-05-15  
**Scope:** `/imports` (Analyzer page) + `/admin/analyzer-rules` (Analyzer Settings) + `/admin/target-costs`  
**Goal:** Turn the Analyzer from a CSV/import technical report into a daily decision assistant for media buyers.

---

## 1. Current Problems

### 1.1 Analyzer Page (`/imports`)

**Information architecture problems:**
- The page is titled "Отчёт по сигналам" (Signal Report) — this describes the output of a technical pipeline, not what a media buyer needs to do.
- The primary selector is a dropdown labeled "CSV-файл" that lists raw filenames like `facebook_ads_2026-05-14.csv`. A media buyer thinks in terms of *"yesterday's data"*, not file names.
- Summary stat cards show "Объектов в анализе" (objects in analysis) and "Нормализованных строк" (normalized rows) — these are pipeline metrics, not decision metrics.
- The signal split is "Сильные сигналы / Слабые сигналы" — two buckets that answer "how strong is the signal?" not "what should I do?". A media buyer's question is: **Stop? Scale? Review? Test more?**
- There is no "Insufficient data" category. Low-maturity subjects just don't appear, leaving the buyer unsure whether silence means "all good" or "not enough data yet."
- The "История импортов" table shows columns: **Строк** (raw rows count), **Нормализовано** (normalized rows) — zero meaning for a media buyer.
- The "Тех. детали" (Tech details) button links to a 900-line developer debug page with storage keys, file hashes, comparison group keys, analyzer result scores, Telegram delivery tracking, etc.

**Decision framework problems:**
- "Сильный сигнал" and "Слабый сигнал" do not map to actions. The buyer has to infer: strong signal → maybe scale? weak signal → maybe stop?
- No explicit "keep running / wait for more data" bucket. Subjects with spend < $25 and 0 results could legitimately need more time — this isn't surfaced.
- Verdict pills like "Перерасход", "Слабый сигнал", "Сильный сигнал", "Нормально" are inconsistently named and don't carry a clear call-to-action.
- Each subject shows a flat metric strip (CTR, CPA, CPLPV, etc.) with no prioritization. The buyer has to mentally parse and compare numbers.

**Technical debt surfaced to the user:**
- The note "CSV-импорты управляются в разделе Ad Accounts" adds cognitive load — why does the user see this on the Analyzer page?
- Pipeline status labels (RECEIVED, PARSING, NORMALIZING, ANALYZING, COMPLETED, FAILED) appear in the import history table visible to all users.
- The detail page exposes: `evaluationMode: results_aware / proxy_mode`, `confidenceLevel: LOW/MEDIUM/HIGH`, `groupKey`, `scopeKey`, `analyzerResultSubjectKey`, `cooldownKey`, Telegram thread IDs, delivery provider message IDs, digest queue windows, `maturityReached: true/false`.

---

### 1.2 Analyzer Settings (`/admin/analyzer-rules`)

**Naming problems:**
- Page title: "Правила и пороги" — abstract. What rules? For what?
- Rule names: "Outbound CTR", "CPLPV", "Spend without results - Creative", "Spend without results - Ad set" — technical metric names with no plain-language explanation of what they flag.
- "Причина" (Reason) field exposes internal reason codes: `spend_anomaly`, `weak_metrics`, `result_weakness`, `mixed_signal` — these are internal system codes, not user-facing labels.
- Severity field: "Инфо / Предупреждение / Критично" — IT severity terminology.
- "Telegram" routing field exposed in every rule row. The media buyer doesn't manage routing topology.

**Architecture exposed to user:**
- Three-tier scope system (Global → По подходу → По funnel) reflects the developer's data model. A media buyer thinks: "default settings" and "exception for this campaign type."
- "Funnel key" concept is completely opaque: the placeholder reads "например, soulmate-main". There is no explanation that this is derived from the campaign naming convention. A media buyer would not know what to type here.
- "Переопределения по funnel" — "overrides by funnel" — developers talk in "overrides", media buyers talk in "exceptions" or "custom settings."
- `<details>` accordion for adding new overrides hides important functionality behind a toggle with no visual hierarchy.

---

### 1.3 Target Costs (`/admin/target-costs`)

Relatively well-structured, but inherits the same "Override" and "Funnel key" terminology problems.

---

## 2. Proposed Analyzer Page Layout (`/imports`)

### 2.1 Core concept: Replace "Import Report" with "Daily Decisions"

The page answers one question for the media buyer every morning: **"What do I do today?"**

It should present decisions grouped by action category, with enough context to act, and hide all technical pipeline details.

---

### 2.2 Page Header

```
[eyebrow] Анализатор
[title]   Решения на сегодня
[description] На основе последних данных — что остановить, что проверить, что масштабировать.
```

---

### 2.3 Date Selector (replaces CSV Selector)

Replace the "CSV-файл" dropdown with a date-based selector:

```
[ Данные за: 14 мая 2026 (вчера) ▼ ]   [ Показать ]
```

The dropdown options should show: **human date + ad account tag**, not filename. Example:
- `14 мая 2026 — Main Account`
- `13 мая 2026 — Main Account`
- `10 мая 2026 — Main Account`

If there are multiple uploads for the same date, show the most recent automatically and add a note "Доступно несколько загрузок за эту дату" with a small secondary link to switch.

Hide filenames entirely. The "Tech details" link stays but is moved to a small secondary link: `[ → Технический лог ]` in the page footer or a collapsed section.

---

### 2.4 Decision Summary Bar (replaces stat cards)

Replace the current 4 stat cards with an action-oriented summary:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  ❌ Стоп     │  ⚠️ Проверь  │  ✅ Масштаб  │  🕐 Тестируй │
│     3        │      7       │      2       │      5       │
│ пора остановить │ есть вопросы │ кандидаты  │ нужно время  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

These four counters are clickable anchors that jump to the corresponding section below.

Mapping from current logic to these categories:
- **Стоп** → `spend_no_results_creative` or `spend_no_results_adset` alerts: spent past threshold, 0 results
- **Проверь** → `weak_performance` (metric violations: CTR below min, CPLPV above max, CPA worse than group peers)
- **Масштаб** → `conversion_arrival` with HIGH or MEDIUM confidence
- **Тестируй** → subjects with low maturity (spend < $25, clicks < 25, impressions < 2500, 0 results), currently invisible

---

### 2.5 Main Decision Sections

Each section is a `<SectionCard>` with a consistent card layout per subject:

#### Section: "Пора остановить" (Stop)
**Description:** "Эти объекты потратили бюджет и не дали результатов."

Card layout per subject:
```
┌────────────────────────────────────────────────────────┐
│ [Креатив] Название объявления                   [СТОП] │
│ Подход: Soulmate · Кабинет: Main Account               │
│                                                        │
│ Расход: $67 · Результатов: 0 · CTR: 0.8%              │
│                                                        │
│ Превышен лимит расхода ($50) без единого результата.   │
└────────────────────────────────────────────────────────┘
```

No technical codes. No "reasonCode: spend_anomaly". Just: what it is, where it spent, why it's flagged.

#### Section: "Требует проверки" (Review)
**Description:** "Результаты есть, но что-то идёт не так. Проверь вручную."

Card layout per subject:
```
┌────────────────────────────────────────────────────────┐
│ [Кампания] Название кампании               [ПРОВЕРИТЬ] │
│ Подход: Retargeting                                    │
│                                                        │
│ CPA: $89 · Лучший в группе: $52 · Разница: +71%       │
│ Outbound CTR: 0.9% (норма: от 1.2%)                   │
│                                                        │
│ CPA значительно выше лучшего в группе. CTR ниже нормы. │
└────────────────────────────────────────────────────────┘
```

Plain-language explanation. No "evaluationMode", no "confidenceLevel HIGH", no "mixed_signal".

#### Section: "Кандидаты на масштабирование" (Scale)
**Description:** "Эти объекты показывают хорошие результаты — можно увеличивать бюджет."

Card layout:
```
┌────────────────────────────────────────────────────────┐
│ [Кампания] Название кампании             [МАСШТАБ] ✅  │
│ Подход: Cold Audience                                  │
│                                                        │
│ Результатов: 5 · CPA: $41 · Расход: $205              │
│ CTR: 2.1%                                              │
│                                                        │
│ Стабильные результаты, CPA в норме.                    │
└────────────────────────────────────────────────────────┘
```

#### Section: "Нужно больше данных" (Test / Wait)
**Description:** "Эти объекты запущены недавно или имеют слишком мало данных для выводов."

Card layout:
```
┌────────────────────────────────────────────────────────┐
│ [Адсет] Название адсета               [РАНО СУДИТЬ]   │
│ Подход: New Creatives                                  │
│                                                        │
│ Расход: $12 · Результатов: 0 · Запущен недавно        │
│                                                        │
│ Дайте ещё минимум $25–$30 расхода перед выводами.     │
└────────────────────────────────────────────────────────┘
```

This section is collapsible by default and shown as collapsed with the count visible: `▶ Нужно больше данных (5 объектов)`.

---

### 2.6 Approach Summary (replaces "Результаты по подходам")

Keep this section but reframe it:

**Title:** "Сводка по подходам"  
**Description:** "Лучший результат каждого активного подхода."

The table shows per approach:
- Approach name
- Best CPA
- Best creative/ad name (the one that got it)
- Total spend
- Result count

No "bestOutboundCtr.subjectLabel / bestCplpv.subjectLabel" verbose format. Just one primary metric per approach.

---

### 2.7 Upload History (replaces "История импортов")

**Title:** "История загрузок"  
**Description:** "Предыдущие загрузки данных."

Table columns: Date, Account, Period covered, Action button "Открыть".

Remove entirely: filename, raw rows count, normalized rows count, pipeline status labels (PARSING, NORMALIZING, etc.).

If the import is still processing, show: "⏳ Обрабатывается…" in the Date cell.

A small admin-only secondary link: "[ → Технический лог ]" on each row links to `/imports/[id]` (the existing technical details page, unchanged in this proposal).

---

## 3. Proposed Analyzer Settings Layout

### 3.1 Page: "Пороги анализатора" (replaces "Правила и пороги")

**URL:** `/admin/analyzer-rules` (unchanged)  
**eyebrow:** "Настройки анализатора"  
**title:** "Пороги срабатывания"  
**description:** "Настройте, при каких показателях анализатор поднимает флаг. Каждый порог применяется глобально, но можно задать исключения для конкретного подхода."

---

### 3.2 Four rules — plain-language names

Replace technical rule names with action-oriented, plain-language descriptions:

| Technical name | Proposed label | Proposed description |
|---|---|---|
| Outbound CTR | **CTR слишком низкий** | Если процент переходов ниже нормы — объект отмечается как требующий проверки. |
| CPLPV | **Стоимость посещения слишком высокая** | Если стоимость перехода на лендинг выше допустимого — объект отмечается как требующий проверки. |
| Spend without results - Creative | **Креатив тратит без результатов** | Если креатив потратил больше лимита, а результатов нет — он попадает в категорию «Стоп». |
| Spend without results - Ad set | **Адсет тратит без результатов** | Если адсет потратил больше лимита без результатов — он попадает в категорию «Стоп». |

---

### 3.3 Rule form — simplified fields

**Remove entirely from rule form:**
- "Telegram" routing field (destinationTopicKey) — it's always `needs_review`, expose in advanced section only
- "Причина" (reasonCode) dropdown — internal code, irrelevant to buyer
- "Уровень сигнала" severity select — always "Предупреждение" for watchdog rules; expose as advanced toggle

**Keep:**
- Enabled toggle (rename to "Активно")
- Min/max values for CTR and CPLPV
- Spend threshold and max results for spend rules

**Add:**
- Inline hint explaining what each field means in practice:
  - For CTR min: "Если CTR ниже этого значения, объект помечается. Типичный диапазон: 1.0–1.5%"
  - For CPLPV max: "Если стоимость посещения выше этого значения, объект помечается. Ориентир: $2–3"
  - For spend threshold: "Лимит расхода без результатов. При $50 и 0 результатах — флаг. Типичный диапазон: $40–70"
  - For max results: "Обычно 0. Означает: флаг только если результатов нет вообще."

---

### 3.4 Scope system — renamed

| Technical term | Proposed label |
|---|---|
| Глобальные правила | Настройки по умолчанию |
| Переопределения по подходам | Исключения по подходам |
| Переопределения по funnel | Исключения по группам кампаний |
| Funnel key | Группа кампаний (ключ) |

The "Funnel key" input should have a help tooltip:  
*"Ключ группы формируется из нейминга кампании. Например, если кампании называются 'soulmate-main-v1', 'soulmate-main-v2' — их ключ группы: soulmate-main. Можно посмотреть в разделе Анализатор → карточка объекта."*

The three-tier scope explanation (global → approach → funnel) should have a one-line contextual note:  
*"Настройки применяются от общих к частным. Исключение по подходу перекрывает глобальные настройки."*

---

### 3.5 Target CPA page — minor adjustments

**Title:** Keep "Целевой CPA", it's clear enough.  
**Change:** Rename "Override" → "Исключение". Rename "Funnel key" → "Группа кампаний (ключ)" (same as above).  
**Add:** A contextual line in the description: *"Цель используется для оценки CPA в разделе Анализатор."*

---

## 4. Exact Labels / Copy Summary

### Navigation
- Sidebar: "Анализатор" → no change
- `/imports` page: eyebrow "Анализатор", title "Решения на сегодня"
- `/imports/[id]` page: keep as developer tool, add label "Технический лог" instead of "Import Run"

### Analyzer Page — Date Selector
- Label: "Данные за:" (replaces "CSV-файл")
- Option format: "14 мая 2026 — {account.tag}"

### Decision Categories
| Category | Label | Pill class | Description |
|---|---|---|---|
| Stop | "Пора остановить" | `pill--stopped` | "Потратили бюджет — результатов нет." |
| Review | "Требует проверки" | `pill--warning` | "Что-то идёт не так. Проверь вручную." |
| Scale | "Кандидаты на масштаб" | `pill--ready` | "Стабильные результаты — можно масштабировать." |
| Test | "Нужно больше данных" | `pill--pending` | "Дайте объекту ещё время и бюджет." |

### Subject Card Labels
- "Креатив" / "Адсет" / "Кампания" (replaces raw `subjectType: creative/adset/campaign`)
- "Расход:" / "Результатов:" / "CPA:" / "CTR:" / "Стоимость посещения:" (replaces metric keys)
- Reason plain text (see Section 3.2)

### Settings Page Labels
| Old | New |
|---|---|
| "Правила и пороги" | "Пороги срабатывания" |
| "Глобальные правила" | "Настройки по умолчанию" |
| "Переопределения по подходам" | "Исключения по подходам" |
| "Переопределения по funnel" | "Исключения по группам кампаний" |
| "Funnel key" | "Группа кампаний (ключ)" |
| "Причина" | (removed from form) |
| "Telegram" | (removed from form / moved to advanced section) |
| "Уровень сигнала" | "Приоритет" (or hidden) |
| "Инфо / Предупреждение / Критично" | "Обычный / Важный / Срочный" |
| "Активно" | no change |

---

## 5. Implementation Plan (Small Steps)

Each step is independently shippable and non-breaking. No backend changes required until Step 5.

### Step 1 — Rename & reframe `/imports` page headers
**Files:** `src/app/(workspace)/imports/page.tsx`  
- Change `eyebrow` to "Анализатор", `title` to "Решения на сегодня", `description` to the proposed copy.
- Rename `SectionCard` titles: "Сильные сигналы" → "Кандидаты на масштаб", "Слабые сигналы" → "Требует проверки".
- Rename "История импортов" → "История загрузок".
- Remove "Строк / Нормализовано" columns from history table; keep Date, Account, Period, Action.
- Change "CSV-файл" label → "Данные за:"; change option format to show date + account tag instead of filename.
*Estimated effort: 2–3 hours. Zero backend changes.*

### Step 2 — Add "Нужно больше данных" section  
**Files:** `src/app/(workspace)/imports/page.tsx`, `src/server/services/import-runs.ts`  
- In `getAnalyzerWorkspaceSnapshot`, add a new `lowMaturitySubjects` bucket: subjects where `maturityReached === false`.
- Add a collapsed section "Нужно больше данных" on the Analyzer page showing these subjects with a plain-language hint: "Расход: $X. Дайте ещё $25–30 перед выводами."
- Add a 4th stat card counting these subjects.
*Estimated effort: 3–4 hours. Minor backend change in import-runs.ts snapshot query.*

### Step 3 — Add "Пора остановить" section as distinct category
**Files:** `src/app/(workspace)/imports/page.tsx`, `src/server/services/import-runs.ts`  
- In the snapshot, split current "weakSubjects" into two: `spendNoResultsSubjects` (stop) and `weakPerformanceSubjects` (review).
- A subject is "stop" if its verdict comes from `spend_no_results_creative` or `spend_no_results_adset` rule violation.
- Render as a separate section above "Требует проверки".
- Add a stat card for stop count.
*Estimated effort: 2–3 hours. Minor backend change.*

### Step 4 — Improve subject cards with plain-language reason text
**Files:** `src/app/(workspace)/imports/page.tsx`, `src/server/services/import-runs.ts`  
- Add a `reasonText` string to each subject in the snapshot, computed from the existing `reason` field and alert kind.
- Render as a single readable sentence under the metric strip: "Превышен лимит расхода ($50) без единого результата." or "CPA на 71% выше лучшего в группе."
- Replace verdict pills with category pills (Стоп / Проверить / Масштаб).
*Estimated effort: 3–4 hours.*

### Step 5 — Date-based selector (replaces filename dropdown)
**Files:** `src/app/(workspace)/imports/page.tsx`, `src/server/services/import-runs.ts`  
- In `getAnalyzerWorkspaceSnapshot`, group recent runs by date (using `reportingWindowEnd`).
- Build a display label: `"14 мая 2026 — {adAccount.tag}"`.
- Update the form selector to use these labels instead of raw filenames.
- Keep importRunId as the underlying value (no URL or query param change needed).
*Estimated effort: 2–3 hours.*

### Step 6 — Rename settings page labels
**Files:** `src/app/(workspace)/admin/analyzer-rules/page.tsx`  
- Update all `PageHeader`, `SectionCard` titles and descriptions per Section 4 above.
- Replace rule labels from `definition.label` (which comes from `foundation.ts`) with plain-language labels using a local mapping object. No changes to `foundation.ts` itself.
- Remove "Telegram" and "Причина" fields from the `RuleRow` form (keep as hidden inputs with their current default values so form submission still works).
- Add inline hint `<span>` under each threshold input field.
- Rename scope section titles.
*Estimated effort: 3–4 hours. Zero backend changes.*

### Step 7 — Fix "Funnel key" UX
**Files:** `src/app/(workspace)/admin/analyzer-rules/page.tsx`, `src/app/(workspace)/admin/target-costs/page.tsx`  
- Rename "Funnel key" label → "Группа кампаний (ключ)".
- Add a help tooltip or `<details>` explanation block explaining what the key is and how to find it.
- Add a secondary link: "Как узнать ключ группы? →" linking to the guide page.
*Estimated effort: 1–2 hours.*

### Step 8 — Hide technical detail page from regular users  
**Files:** `src/app/(workspace)/imports/page.tsx`, `src/app/(workspace)/imports/[importRunId]/page.tsx`  
- In the history table, move "Детали" button to be admin-only (check session role).
- Rename "Тех. детали" link → "Технический лог".
- On the detail page itself, update PageHeader to: eyebrow "Технический лог", title being the filename.
*Estimated effort: 1–2 hours.*

---

## 6. Files Likely Involved

### Analyzer Page
- `src/app/(workspace)/imports/page.tsx` — primary page, most changes
- `src/app/(workspace)/imports/[importRunId]/page.tsx` — header rename, admin-only guard
- `src/server/services/import-runs.ts` — snapshot query changes (Steps 2, 3, 5)

### Analyzer Settings
- `src/app/(workspace)/admin/analyzer-rules/page.tsx` — label changes, form simplification
- `src/app/(workspace)/admin/analyzer-rules/actions.ts` — hidden field defaults (if Telegram/reason fields removed from form)
- `src/app/(workspace)/admin/target-costs/page.tsx` — label changes

### Shared
- `src/components/workspace/settings-section-nav.tsx` — nav label for "Правила" → "Пороги" (optional)
- `src/lib/navigation.ts` — description text update (optional)
- `src/server/analyzer/foundation.ts` — **do not touch** (no backend logic changes in this proposal)
- `src/server/analyzer/execution.ts` — **do not touch**

---

## 7. What NOT to change in this proposal

- No changes to `execution.ts` or `foundation.ts` (analyzer logic stays identical)
- No changes to alert kinds, reason codes, severity levels in the DB schema
- No changes to Telegram routing or notification system
- No changes to `/imports/[importRunId]` technical content (only the header and access guard)
- No changes to CSV import, bulk import, dashboard, or creative storage

---

## 8. Visual Reference: Before / After

### Before: Analyzer page decision area
```
[Сильные сигналы]          [Слабые сигналы]
• Campaign Name             • Campaign Name
  Кандидат на масштаб         Нужна проверка
  Результатов: 5              Расход: $67
  CPA: $41                    CTR: 0.8%
  CTR: 2.1%                   CPLPV: $3.20
  CPLPV: $1.10
```

### After: Analyzer page decision area
```
❌ Пора остановить (3)    ⚠️ Требует проверки (7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Креатив] Ad Name                       [СТОП]
Подход: Soulmate · Main Account
Расход: $67 · Результатов: 0 · CTR: 0.8%
Превышен лимит расхода ($50) без единого результата.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Кандидаты на масштаб (2)   🕐 Нужно больше данных (5) ▶
```

### Before: Settings rule form
```
[Outbound CTR]  [✓ Активно]  [Предупреждение ▼]
Минимальный guardrail по outbound CTR для future watchdog-проверок.
Min: [1.2]  Max: [—]  Telegram: [needs_review ▼]  Причина: [weak_metrics ▼]
Комментарий: [Базовый global guardrail по outbound CTR.]
```

### After: Settings rule form
```
[CTR слишком низкий]  [✓ Активно]
Если процент переходов ниже нормы — объект отмечается как требующий проверки.

Минимальный CTR (%):  [1.2]
                       ↑ Если CTR ниже этого значения, объект помечается. Типичный диапазон: 1.0–1.5%

[Сохранить]
```
