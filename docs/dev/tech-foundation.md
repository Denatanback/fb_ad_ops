# Tech Foundation

## Recommended MVP stack
- App framework: Next.js App Router with TypeScript.
- Backend/API approach: a single monolith using server components for data-heavy pages, server actions for trusted mutations, and route handlers for internal JSON endpoints where needed.
- Database: PostgreSQL.
- ORM and schema tool: Prisma.
- Authentication for MVP: Auth.js with credential-based sign-in, secure session cookies, and Prisma-backed user and session tables.
- Role model: `admin` and `member` stored as an enum on the user record.

## Why this stack
- It is fast to implement for an internal tool because one framework handles UI, authenticated server logic, and operational pages.
- It fits Dockerized deployment cleanly with one web container and one PostgreSQL service.
- It supports the project's data-heavy UI direction without adding service boundaries too early.
- It keeps authentication first-class instead of bolting it on after the domain model is built.

## MVP architecture shape
- One internal workspace for all authenticated users.
- No tenant model for MVP.
- Route protection should happen at the application shell and module boundary level, not only inside individual screens.
- Core mutable records should include `created_by` and `updated_by` as already documented in `docs/product/access.md`.

## High-level module boundaries
- `auth`: sign-in, session validation, route protection, password flows, and current-user helpers.
- `users`: user listing, role assignment, and admin-only user management.
- `approaches`: CRUD and list/detail views for top-level business entities.
- `creatives`: CRUD, status changes, tags, and detail pages.
- `landers`: CRUD and list/detail views for landers.
- `launches`: launch creation, status lifecycle, notes, and launch-level associations.
- `metrics`: launch metric entry, validation, and reporting-friendly reads.
- `imports`: future CSV upload intake, import tracking, and execution kickoff.
- `analyzer`: future comparison-group analysis, ranking logic, maturity gates, and alert candidate generation.
- `alerts`: future persisted alert records, cooldown decisions, and review state.
- `notifications`: outbound delivery adapters such as Telegram.
- `reporting`: launch, creative, and approach summaries for dashboard and operational views.
- `ui`: layout shell, navigation, data table primitives, filters, forms, badges, and detail panels.

## Local development flow
- Run PostgreSQL locally with Docker Compose.
- Run the web app in development mode against that database for fast iteration.
- Apply Prisma migrations during setup and when schema changes are introduced.
- Seed or create the first `admin` account during setup so the app always starts with manageable access.
- Keep the local workflow simple: one app process, one database service, one shared env file.

## Docker strategy
- Use a multi-stage Dockerfile for the Next.js app.
- Use Docker Compose for local development with at least `app` and `db` services.
- Persist PostgreSQL data in a named volume.
- For MVP deployment, target a single server running the app container and PostgreSQL, or an app container plus a managed PostgreSQL instance if available.
- Avoid splitting the backend into separate API services until the internal tool proves the need.

## Expected environment variables
- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: secret used to sign sessions and auth tokens.
- `APP_BASE_URL`: canonical base URL for auth callbacks and generated links.
- `DEFAULT_ADMIN_EMAIL`: bootstrap email for the first admin account.
- `DEFAULT_ADMIN_PASSWORD`: bootstrap password for the first admin account.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID for the internal Drive integration.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret for the internal Drive integration.
- `GOOGLE_DRIVE_OAUTH_REDIRECT_URI`: optional explicit OAuth callback URL override.
- `GOOGLE_DRIVE_FOLDER_ID`: optional target folder ID in My Drive for creative uploads.
- `INTERNAL_IMPORT_API_KEY`: server-to-server secret for the external CSV upload script.
- `IMPORT_UPLOADS_DIR`: optional local filesystem override for uploaded import files.
- `TELEGRAM_BOT_TOKEN`: bot token for shared-chat delivery.
- `TELEGRAM_CHAT_ID`: target shared chat identifier for internal alerts.
- `TELEGRAM_ALERTS_ENABLED`: explicit feature flag for Telegram delivery.
- `TELEGRAM_TOPIC_CONVERSIONS_ID`: forum topic ID for conversion alerts.
- `TELEGRAM_TOPIC_NEEDS_REVIEW_ID`: forum topic ID for action-bucket review alerts.
- `TELEGRAM_TOPIC_STRONG_SIGNALS_ID`: forum topic ID for strong signals and opportunities.
- `TELEGRAM_TOPIC_IMPORT_ERRORS_TECH_ID`: forum topic ID for technical import failures.
- `TELEGRAM_TOPIC_BOT_TEST_ID`: forum topic ID for manual notifier checks.
- `NODE_ENV`: runtime environment.

## Theming strategy
- Default to dark mode on first load.
- Support an explicit light/dark toggle from the start.
- Implement theme tokens with CSS variables and switch them via an attribute on the root layout, such as `data-theme="dark"` and `data-theme="light"`.
- Store the selected theme in a user preference or cookie so the app keeps the user's choice across sessions.
- Keep components token-driven so tables, filters, sidebars, topbars, and detail pages remain visually consistent.

## MVP implementation notes
- Keep the API and UI naming aligned with the existing product docs: Approach, Creative, Lander, Launch, Launch Metrics, and Creative Tags.
- Keep launch analytics attached to launches rather than flattening them into creative records.
- Keep the role system intentionally simple for MVP: `admin` and `member` only.
- Keep creative media storage preview-first and external-reference-first: Google Drive-backed originals are preferred over storing full original media files on the app server by default.
- For the current MVP media path, use a single admin-controlled Google OAuth connection to a personal Google account / My Drive folder.
- Plan the future import and alerting flow around server-side execution: CSV upload, import record, analyzer run, persisted alerts, and optional Telegram send.
- Future analyzer comparisons should work within analogous internal groups, such as a funnel or other shared naming/global group inside an Approach.
- Future alerting should distinguish result-aware evaluation from proxy-mode evaluation, apply maturity gates before weak-performance alerts, and leave room for cooldown or anti-spam policy.
- Telegram delivery should use one shared forum supergroup chat ID plus per-route topic IDs so alert categories can stay separated by thread.
- Advanced permissions, tenant isolation, and public SaaS concerns remain out of scope unless explicitly requested later.
