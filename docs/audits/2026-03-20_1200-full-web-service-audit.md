# Full Web Service Audit

**Date:** 2026-03-20
**Scope:** Complete audit of FB Ads Ops as a daily-use internal web service
**Auditor:** Automated deep code review
**Files inspected:** ~90 source files across src/, prisma/, docs/, Docker config

---

## Executive Summary

FB Ads Ops is a well-structured internal web service with solid foundations: clear domain modeling, good Prisma schema design, proper auth wiring, a functional import/analyzer pipeline, and a coherent dark-first UI system. The documentation is unusually thorough for an MVP.

However, the system is **not yet ready for reliable daily use**. The critical gaps are: (1) real secrets committed in `.env.example`, (2) no production Dockerfile or deployment path, (3) synchronous import processing blocking HTTP requests, (4) no dashboard page at `/`, (5) missing pagination on all list queries, (6) no admin pages accessible from sidebar navigation, and (7) Google Drive OAuth tokens stored in plaintext in the database.

The domain model is clean and correctly implements the documented rules. The analyzer pipeline is impressively complete for an MVP. The main risks are operational: the system will hit scaling walls on moderate data volumes and lacks the resilience needed for daily use without supervision.

---

## Overall Readiness Assessment

| Area | Rating | Notes |
|------|--------|-------|
| Domain model correctness | Good | Aligned with docs, clean separation |
| Auth & security | Needs work | Real secrets in repo, tokens in plaintext |
| UI/UX for daily use | Partial | Functional but verbose, missing dashboard |
| Import/analyzer pipeline | Good foundation | Sync execution is a blocker at scale |
| Google Drive integration | Functional | Token refresh works, but no encryption |
| Telegram integration | Functional | Clean routing, proper topic separation |
| Production readiness | Not ready | No production Dockerfile, no healthcheck beyond `/api/health` |
| Code quality | Good | Clean patterns, minimal duplication |

---

## Top 10 Issues by Priority

### 1. CRITICAL: Real secrets committed in `.env.example`

- **severity:** critical
- **area:** security
- **why it matters:** `.env.example` contains real Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), a real Telegram bot token (`TELEGRAM_BOT_TOKEN`), a real Telegram chat ID, a real admin email, and a real admin password. This file is tracked in version control. Anyone with repo access has these credentials.
- **likely affected files:** `.env.example`
- **recommended fix direction:** Replace all values in `.env.example` with clearly fake placeholders (e.g., `your-google-client-id-here`). Rotate all exposed credentials immediately. Add `.env` to `.gitignore` if not already present. Consider using `git filter-branch` or BFG to remove secrets from history.

### 2. HIGH: No production Dockerfile or deployment strategy

- **severity:** high
- **area:** infra
- **why it matters:** The Dockerfile only has a `development` target that runs `npm run dev`. There is no production build stage, no `next build`, no standalone output, no production `CMD`. The system cannot be deployed to production as-is.
- **likely affected files:** `Dockerfile`, `docker-compose.yml`
- **recommended fix direction:** Add a multi-stage Dockerfile with `builder` (runs `next build`) and `production` (runs `next start` with standalone output) stages. Add a production compose profile or separate compose file.

### 3. HIGH: Import processing is fully synchronous within the HTTP request

- **severity:** high
- **area:** backend
- **why it matters:** `POST /api/imports/upload` and the manual upload action both call `kickOffImportProcessing()` synchronously. This means the entire CSV parse -> normalize -> analyze -> telegram notify pipeline runs inside a single HTTP request/server action. For large CSVs, this will timeout (Next.js default body timeout, Vercel/proxy timeouts, Docker healthcheck). This also means a stuck import blocks the request indefinitely.
- **likely affected files:** `src/server/imports/intake.ts`, `src/server/imports/processing.ts`, `src/app/(workspace)/imports/actions.ts`, `src/app/api/imports/upload/route.ts`
- **recommended fix direction:** Accept the upload, create the ImportRun, return 202 immediately. Process asynchronously via a background job, a separate worker process, or at minimum a fire-and-forget `Promise` with proper error recording. The status polling UI already exists in the imports page.

### 4. HIGH: No dashboard page exists at `/`

- **severity:** high
- **area:** ui
- **why it matters:** The navigation has "Dashbord" pointing to `/`, and the docs spec a dashboard with totals by approach, status, winners/losers/top_ctr, and scaling count. But there is no `src/app/(workspace)/page.tsx`. Users landing on `/` after login will get a 404 or the guide page. This is the first thing a daily user sees.
- **likely affected files:** Missing `src/app/(workspace)/page.tsx`
- **recommended fix direction:** Create a dashboard page with summary cards for status counts, approach breakdown, recent imports, and quick navigation. The `getOperationalViewData` service already provides most of the needed data.

### 5. HIGH: Google Drive OAuth tokens stored in plaintext in database

- **severity:** high
- **area:** security
- **why it matters:** `GoogleDriveIntegration.accessToken` and `refreshToken` are stored as plain `@db.Text` fields. If the database is compromised, the attacker gets full Google Drive access. This is a personal Google account with `drive.file` scope.
- **likely affected files:** `prisma/schema.prisma`, `src/server/integrations/google-drive/service.ts`
- **recommended fix direction:** Encrypt tokens at rest using a server-side encryption key (e.g., AES-256-GCM with a key from `AUTH_SECRET` or a dedicated env var). Decrypt on read in the service layer.

### 6. HIGH: No pagination on any list query

- **severity:** high
- **area:** backend / ui
- **why it matters:** `listCreatives`, `listRecentImportRuns(12)`, `getOperationalViewData`, and all other list queries have no `skip`/`take` pagination. With 500+ creatives or 100+ import runs, these pages will load slowly and the DOM will be huge. The imports page hardcodes `12` but provides no "load more" or pagination controls.
- **likely affected files:** `src/server/services/creatives.ts`, `src/server/services/operations.ts`, `src/server/services/import-runs.ts`, all list page components
- **recommended fix direction:** Add cursor-based or offset pagination to all list services. Add pagination UI controls. Start with creatives list as it's the highest-traffic page.

### 7. MEDIUM: Admin pages not accessible from sidebar navigation

- **severity:** medium
- **area:** ui
- **why it matters:** Admin pages (`/admin/notifications`, `/admin/analyzer-rules`, `/admin/google-drive`) have `showInSidebar: false` in navigation config. Daily admin users must know the URLs or navigate through the guide page. There's no admin section in the sidebar for admin-role users.
- **likely affected files:** `src/lib/navigation.ts`, `src/components/layout/sidebar.tsx`
- **recommended fix direction:** Show admin nav items in sidebar when the user has admin role. Pass session/role to Sidebar and conditionally render an "Admin" group.

### 8. MEDIUM: No role-based protection on admin pages (server-side)

- **severity:** medium
- **area:** auth
- **why it matters:** The admin pages for notifications, analyzer rules, and Google Drive call `requireAuthSession()` but do NOT call `requireRole("admin")`. Any authenticated `member` can access these admin pages, view Telegram config, edit analyzer rules, and trigger test Telegram sends. The import details page checks `isAdmin` for the rerun button, but the action itself (`rerunImportAnalyzerAction`) only calls `requireAuthSession()`.
- **likely affected files:** `src/app/(workspace)/admin/notifications/page.tsx`, `src/app/(workspace)/admin/analyzer-rules/page.tsx`, `src/app/(workspace)/admin/google-drive/page.tsx`, `src/app/(workspace)/admin/notifications/actions.ts`, `src/app/(workspace)/admin/analyzer-rules/actions.ts`
- **recommended fix direction:** Add `requireRole("admin")` to all admin page components and their server actions. The helper already exists in `src/server/auth/session.ts`.

### 9. MEDIUM: Duplicate `formatByteSize` and label maps across pages

- **severity:** medium
- **area:** code quality
- **why it matters:** `formatByteSize()` is duplicated identically in `imports/page.tsx` and `imports/[importRunId]/page.tsx`. `importRunStatusLabels` is also duplicated. Several label maps (`evaluationModeLabels`, `confidenceLabels`, etc.) are defined inline in the import detail page. This will drift.
- **likely affected files:** `src/app/(workspace)/imports/page.tsx`, `src/app/(workspace)/imports/[importRunId]/page.tsx`, `src/lib/formatters.ts`
- **recommended fix direction:** Move shared formatters and label maps to `src/lib/formatters.ts` or a new `src/lib/import-labels.ts`. Import in both pages.

### 10. MEDIUM: No file size limit on CSV or creative upload

- **severity:** medium
- **area:** security / backend
- **why it matters:** Neither the API upload route nor the manual upload action enforce a maximum file size. A malicious or accidental 1GB CSV upload will be read fully into memory (`Buffer.from(await file.arrayBuffer())`), potentially crashing the Node.js process. Same for creative file uploads to Google Drive.
- **likely affected files:** `src/server/imports/storage.ts`, `src/server/imports/intake.ts`, `src/app/(workspace)/creatives/actions.ts`
- **recommended fix direction:** Add a `MAX_IMPORT_FILE_SIZE` check (e.g., 50MB) before processing. Add a `MAX_CREATIVE_FILE_SIZE` check (e.g., 500MB) before Drive upload. Return clear error messages.

---

## Product/Domain Issues

### Domain model alignment: Generally good

The implemented Prisma schema closely matches `docs/product/entities.md`. Key domain rules are correctly enforced:

- Approach is the top-level entity (correct)
- Offer is NOT a separate entity (correct, not present)
- Creative belongs to exactly one Approach via `approachId` (correct)
- Creative can have many Launches (correct)
- Launch has `budgetMode` for ABO/CBO distinction (correct)
- Tags (winner/loser/top_ctr) are separate from lifecycle statuses (correct, via `CreativeLabelAssignment`)
- Lifecycle statuses are `queue/active/stopped/scaling` (correct)

### P-D1: ImportNormalizedRow missing `outboundCtr` and `cplpv` columns

- **severity:** medium
- **area:** product / imports
- **why it matters:** The CSV format supports optional `Outbound CTR`, `CPLPV`, and `CR` columns. The meta-ads-format parser extracts them into `normalizedPayload.additionalMetrics`, but the `ImportNormalizedRow` schema has no dedicated columns for `outbound_ctr`, `cplpv`, or `cr`. The analyzer then reads these from the JSON payload, which means they aren't queryable or indexable.
- **likely affected files:** `prisma/schema.prisma` (ImportNormalizedRow model), `src/server/imports/meta-ads-format.ts`, `src/server/analyzer/execution.ts`
- **recommended fix direction:** Add `outboundCtr`, `cplpv`, and `cr` Decimal columns to `ImportNormalizedRow`. Populate them during normalization alongside the JSON payload.

### P-D2: Analyzer doesn't link to core domain entities

- **severity:** low
- **area:** product
- **why it matters:** The analyzer creates comparison groups with `approachId` links, but imported rows don't link to actual `Creative` or `Launch` records. The naming-based extraction (`approachName`, `campaignName`, etc.) remains disconnected from the core domain graph. This is documented as intentional for MVP, but it means there's no bridge between "what the analyzer found" and "which creative in our library."
- **likely affected files:** `src/server/analyzer/execution.ts`, `prisma/schema.prisma`
- **recommended fix direction:** Future work. Document this gap explicitly. Consider a matching step that attempts to resolve imported ad names to existing Creative records by name similarity.

### P-D3: `created_by`/`updated_by` fields are nullable

- **severity:** low
- **area:** product
- **why it matters:** `docs/product/access.md` says core mutable entities should include `created_by` and `updated_by` for accountability. The schema has these fields but they're all `String?` (nullable) with `onDelete: SetNull`. This means if a user is deleted, all audit trail is lost. For an internal accountability tool, this is a design weakness.
- **likely affected files:** `prisma/schema.prisma`
- **recommended fix direction:** Consider making these non-nullable for future records. For user deletion, consider soft-delete or keeping a denormalized email/name on the audit field instead of a FK.

---

## UI/UX Issues

### U-1: Pages are verbose and card-heavy

- **severity:** medium
- **area:** ui
- **why it matters:** Every page wraps content in `SectionCard` components with titles and descriptions. The queue/active/scaling pages have a `hero-grid` with a panel + action card, then a filters card, then the table card. For daily operational use, this is too much chrome. A media buyer checking active creatives doesn't need to re-read "Практичный live-список для ежедневной проверки" every time. The `description` prop on `PageHeader` is also very long on most pages.
- **likely affected files:** `src/components/operations/operational-workspace-view.tsx`, `src/app/(workspace)/creatives/page.tsx`, `src/app/(workspace)/imports/page.tsx`
- **recommended fix direction:** Make descriptions shorter or collapsible. Consider removing `SectionCard` wrapper from the main table section. Move explanatory text to the guide page only.

### U-2: No mobile/responsive layout

- **severity:** medium
- **area:** ui
- **why it matters:** The workspace shell uses `grid-template-columns: 248px minmax(0, 1fr)`. The CSS file (1302 lines) has no `@media` queries for mobile breakpoints. On a phone or small tablet, the sidebar will compress the content area into an unusable width. Internal tool users may check status on mobile.
- **likely affected files:** `src/app/globals.css`
- **recommended fix direction:** Add a mobile breakpoint (~768px) that collapses the sidebar into a hamburger menu or bottom nav. Make tables horizontally scrollable (already has `.table-shell` with `overflow-x: auto`, which is good).

### U-3: No creatives list page (only the library view)

- **severity:** low
- **area:** ui
- **why it matters:** The documented "Creatives list" screen spec says: filters (approach, status, tags, lander), search, sortable table. The current implementation has search and filters for approach/status/label but no lander filter, no table sorting (clicking column headers), and no date range filter. The `docs/ux/filters.md` spec includes date range and table sorting by CTR/CPC/CPM/Results/Cost per result, none of which are implemented.
- **likely affected files:** `src/components/creatives/creative-filters.tsx`, `src/app/(workspace)/creatives/page.tsx`
- **recommended fix direction:** Add lander filter, column sorting, and date range filter incrementally.

### U-4: Admin pages have no navigation discoverability

- **severity:** medium
- **area:** ui
- Covered in Top 10 #7 above.

### U-5: Form inputs use `auth-input` class for non-auth fields

- **severity:** low
- **area:** ui
- **why it matters:** The CSV upload form uses `className="auth-input"` for the file input. This class was designed for the sign-in form. It works visually but the naming is confusing and the styling may not be optimal for file inputs.
- **likely affected files:** `src/app/(workspace)/imports/page.tsx`
- **recommended fix direction:** Create a generic `field__input` class or similar. Keep `auth-input` for the sign-in form only.

### U-6: `lang="en"` on HTML root despite Russian UI

- **severity:** low
- **area:** ui
- **why it matters:** The root layout sets `lang="en"` but the entire UI is in Russian. This affects screen readers, spell checkers, and search engines.
- **likely affected files:** `src/app/layout.tsx`
- **recommended fix direction:** Change to `lang="ru"`.

---

## Functional/Bug Risks

### F-1: `searchParams` typing will break in Next.js 15+

- **severity:** high
- **area:** backend
- **why it matters:** Multiple pages use `searchParams` as a synchronous prop (`searchParams?.status`). In Next.js 15, `searchParams` becomes a `Promise`. The current codebase uses Next.js 14.2.x, but upgrading will break all pages that read search params. Since the project is young, this should be addressed proactively.
- **likely affected files:** All page components that use `searchParams`
- **recommended fix direction:** When upgrading to Next.js 15, await `searchParams` in each page. Consider preparing now by using a helper that abstracts the access pattern.

### F-2: `redirect()` inside try/catch swallows the redirect

- **severity:** high
- **area:** backend
- **why it matters:** In `createCreativeAction` (line 361), `redirect()` is called inside a `try` block. In Next.js, `redirect()` throws a special error that must propagate. The outer `catch` block checks for `PrismaClientKnownRequestError` but then has `throw error` which re-throws the redirect. This works but is fragile. If someone adds a generic catch, the redirect will be silently swallowed. Same pattern in `updateCreativeAction`.
- **likely affected files:** `src/app/(workspace)/creatives/actions.ts`
- **recommended fix direction:** Move `redirect()` calls outside try/catch blocks. Execute the DB operation inside try/catch, then redirect after.

### F-3: No duplicate import detection

- **severity:** medium
- **area:** imports
- **why it matters:** The `sourceFileHash` is stored but never checked. Uploading the same CSV twice creates duplicate `ImportRun` records, duplicate raw/normalized rows, duplicate analyzer results, and duplicate Telegram notifications. For daily use where the same export might be uploaded multiple times, this causes noise.
- **likely affected files:** `src/server/imports/intake.ts`, `src/server/services/import-runs.ts`
- **recommended fix direction:** Before processing, check if an ImportRun with the same `sourceFileHash` already exists. Warn or skip if found. The index on `sourceFileHash` already exists in the schema.

### F-4: Analyzer rerun doesn't clean up previous results

- **severity:** medium
- **area:** analyzer
- **why it matters:** The `rerunImportAnalyzerAction` calls `runImportAnalyzer()` which creates new comparison groups, results, alerts, and deliveries. But it doesn't delete the previous analyzer output for that import run. This means repeated reruns accumulate duplicate results.
- **likely affected files:** `src/server/analyzer/execution.ts`, `src/app/(workspace)/imports/[importRunId]/actions.ts`
- **recommended fix direction:** Add a cleanup step at the start of `runImportAnalyzer` that deletes existing `AnalyzerComparisonGroup`, `AnalyzerResult`, `AlertEvent`, and `NotificationDelivery` records for the given `importRunId`.

### F-5: Manual import upload action has no CSRF/user-ID binding

- **severity:** medium
- **area:** auth / imports
- **why it matters:** The `uploadImportCsvAction` server action calls `requireAuthSession()` but doesn't pass `session.user.id` as `uploadedById` to the intake function. The API route doesn't set `uploadedById` at all (it uses API key auth, not session auth). This means manual uploads have no audit trail of who uploaded them.
- **likely affected files:** `src/app/(workspace)/imports/actions.ts`
- **recommended fix direction:** Pass `session.user.id` as `uploadedById` when calling `acceptCsvImportUpload` from the manual upload action.

### F-6: `getGoogleDriveConnectedIntegration` doesn't validate token state

- **severity:** low
- **area:** integrations
- **why it matters:** `getGoogleDriveConnectedIntegration()` returns the raw DB record without checking if the token is expired or if a refresh is needed. The creative upload form uses this to show "connected" status, but the token might be expired. The actual upload path correctly refreshes, but the UI status check is misleading.
- **likely affected files:** `src/server/integrations/google-drive/service.ts`
- **recommended fix direction:** Add an `isTokenLikelyValid` check that compares `expiresAt` to `Date.now()`. Show a warning in the UI if the token appears expired.

---

## Security / Operational Risks

### S-1: Real credentials in `.env.example`

- Covered in Top 10 #1 above. This is the single most urgent security issue.

### S-2: OAuth tokens stored in plaintext

- Covered in Top 10 #5 above.

### S-3: No rate limiting on import upload endpoint

- **severity:** medium
- **area:** security
- **why it matters:** The `/api/imports/upload` endpoint is protected by API key but has no rate limiting. A compromised or misconfigured upload script could flood the system with imports, each triggering full synchronous processing and Telegram notifications.
- **likely affected files:** `src/app/api/imports/upload/route.ts`
- **recommended fix direction:** Add a simple rate limit (e.g., max 10 uploads per minute per API key). Consider using Next.js middleware or a simple in-memory counter.

### S-4: No rate limiting on sign-in attempts

- **severity:** medium
- **area:** security / auth
- **why it matters:** The credentials-based auth flow has no brute-force protection. An attacker can try unlimited password guesses against the sign-in endpoint.
- **likely affected files:** `src/server/auth/config.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- **recommended fix direction:** Add rate limiting on failed auth attempts. Consider IP-based or email-based lockout after N failures.

### S-5: `INTERNAL_IMPORT_API_KEY` default value is weak

- **severity:** medium
- **area:** security
- **why it matters:** `.env.example` has `INTERNAL_IMPORT_API_KEY="replace-with-a-long-internal-upload-key"`. If someone copies `.env.example` to `.env` without changing this value, the import endpoint is effectively open to anyone who guesses or reads this default.
- **likely affected files:** `.env.example`
- **recommended fix direction:** Make the app refuse to start if `INTERNAL_IMPORT_API_KEY` is the default placeholder value. Add a startup validation check.

### S-6: `Google Drive OAuth callback` route is in `publicRoutes`

- **severity:** low
- **area:** security
- **why it matters:** `/api/integrations/google-drive/callback` is listed in `publicRoutes` in middleware, meaning it bypasses auth. The callback handler itself validates the OAuth state parameter (which includes userId and HMAC), so this is not directly exploitable. But it means anyone can hit the callback URL with arbitrary parameters, which could produce confusing error logs.
- **likely affected files:** `src/middleware.ts`, `src/app/api/integrations/google-drive/callback/route.ts`
- **recommended fix direction:** This is acceptable for OAuth flows but should be documented. The state validation is the security boundary here.

---

## Code Quality / Maintainability Issues

### C-1: Duplicated where-clause builders across services

- **severity:** medium
- **area:** code quality
- **why it matters:** `buildOperationalWhere` in `operations.ts` and the where-clause builder in `creatives.ts` (`listCreatives`) duplicate the same search/filter logic (query searches name/type/notes, approachId filter, label filter). If a new searchable field is added, both must be updated.
- **likely affected files:** `src/server/services/operations.ts`, `src/server/services/creatives.ts`
- **recommended fix direction:** Extract a shared `buildCreativeWhereInput(filters)` helper used by both services.

### C-2: Inline label/status maps instead of shared constants

- **severity:** medium
- **area:** code quality
- Covered in Top 10 #9 above.

### C-3: CSS is a single 1302-line file with no component scoping

- **severity:** medium
- **area:** code quality / ui
- **why it matters:** All styles are in `globals.css` with global class names. There's no CSS Modules, no Tailwind, no component-scoped styles. For an MVP this works, but naming collisions will become an issue as the UI grows. The file is already difficult to navigate.
- **likely affected files:** `src/app/globals.css`
- **recommended fix direction:** Consider splitting into thematic CSS files (layout, tables, forms, cards, etc.) or adopting CSS Modules for component-specific styles. Not urgent but will pay off as the UI grows.

### C-4: Large analyzer execution.ts file (~600+ lines)

- **severity:** low
- **area:** code quality
- **why it matters:** `src/server/analyzer/execution.ts` is the largest file in the codebase. It handles grouping, scoring, maturity gates, rule evaluation, alert creation, and Telegram delivery all in one module. The logic is well-structured internally but the file will be hard to maintain as more rules and evaluation modes are added.
- **likely affected files:** `src/server/analyzer/execution.ts`
- **recommended fix direction:** Split into separate modules: `grouping.ts`, `scoring.ts`, `rule-evaluation.ts`, `alert-dispatch.ts`. Keep `execution.ts` as the orchestrator.

### C-5: TypeScript strict mode is enabled (confirmed)

- **severity:** n/a (not an issue)
- **area:** code quality
- **notes:** `tsconfig.json` has `"strict": true` and targets ES2022 with bundler module resolution. Path alias `@/*` maps to `./src/*`. This is correctly configured.

### C-6: No linting or formatting tooling

- **severity:** low
- **area:** code quality
- **why it matters:** `package.json` has no ESLint, Prettier, or any linting dependencies. No lint/format scripts. Code style is currently consistent (likely maintained by a single developer + AI), but will drift with multiple contributors.
- **likely affected files:** `package.json`
- **recommended fix direction:** Add ESLint with Next.js config and Prettier. Add `lint` and `format` scripts.

---

## Quick Wins

1. **Replace secrets in `.env.example`** with placeholder values. Rotate compromised credentials. (30 min, critical impact)
2. **Add `lang="ru"`** to root layout HTML element. (1 min, correctness)
3. **Add `requireRole("admin")`** to all admin page components and actions. (15 min, security)
4. **Pass `session.user.id`** as `uploadedById` in the manual import upload action. (5 min, audit trail)
5. **Move duplicated `formatByteSize` and label maps** to `src/lib/formatters.ts`. (15 min, maintainability)
6. **Add file size validation** to import upload and creative upload. (20 min, resilience)
7. **Add a root page** (`src/app/(workspace)/page.tsx`) even if just a redirect to `/queue` or a simple status summary. (15 min, UX)
8. **Show admin nav items in sidebar** for admin-role users. (30 min, UX)
9. **Add duplicate import detection** by checking `sourceFileHash` before processing. (20 min, noise reduction)
10. **Add cleanup step** to analyzer rerun to delete previous results first. (15 min, correctness)

---

## Recommended Next 5 Implementation Steps

### Step 1: Security polish (1 short session)

1. Scrub `.env.example` of all real credentials
2. Add `requireRole("admin")` to all admin pages and actions
3. Add file size limits to upload paths
4. Pass userId to manual import uploads
5. Add startup validation that rejects default/placeholder API keys

### Step 2: Dashboard + navigation (1 session)

1. Create `src/app/(workspace)/page.tsx` with status counts, recent imports, and quick actions
2. Make admin nav items visible to admin users in sidebar
3. Fix `lang="ru"` on root layout
4. Shorten page descriptions for daily-use readability

### Step 3: Production readiness (1 medium session)

1. Add production stages to Dockerfile (`builder` + `runner`)
2. Add `next build` step and standalone output config
3. Add basic production docker-compose profile
4. Add pagination to creatives list and import runs list
5. Add a simple startup healthcheck that validates required env vars

### Step 4: Async import processing (1 medium session)

1. Separate import acceptance from processing
2. Return 202 immediately after storing the file and creating the ImportRun
3. Process asynchronously (background promise, worker, or queue)
4. Add duplicate import detection via sourceFileHash
5. Add cleanup before analyzer rerun

### Step 5: Resilience + code quality (1 session)

1. Extract shared where-clause builders
2. Extract shared label maps and formatters
3. Add ESLint + Prettier
4. Split analyzer execution.ts into smaller modules
5. Add rate limiting to import upload and auth endpoints

---

## Fix Plan Summary

### Pass 1: Short polish pass (1-2 hours)

Focus: Security fixes, quick wins, remove embarrassing gaps.

- Scrub `.env.example`
- Add admin role checks
- Fix lang attribute
- Add file size limits
- Fix uploadedById on manual imports
- Extract shared formatters
- Add duplicate import hash check
- Add analyzer rerun cleanup

### Pass 2: Medium structural pass (4-6 hours)

Focus: Make the product genuinely usable for daily work.

- Create dashboard page
- Add admin navigation for admin users
- Add pagination to all list queries
- Shorten page descriptions
- Add production Dockerfile stages
- Add env var validation on startup
- Move `redirect()` calls outside try/catch

### Pass 3: Reliability/integration pass (4-6 hours)

Focus: Make the system resilient under real daily load.

- Make import processing async
- Add rate limiting to upload and auth
- Add token encryption for Google Drive
- Split analyzer into smaller modules
- Add ESLint + Prettier
- Add responsive CSS breakpoints for mobile
- Add integration tests for the import pipeline
