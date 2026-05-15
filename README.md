# FB Ads Ops

Internal Facebook Ads operations web service for an in-house media buying team.

This repository is a single Next.js App Router + Prisma application. It is not a monorepo and it is not the unrelated agency spend sync scaffold that was accidentally mixed into the root bootstrap layer.

## Product Scope

- protected internal workspace with authenticated accounts
- approaches, creatives, launches, landers
- CSV import pipeline for Meta Ads exports
- analyzer + persisted alerts + Telegram digests
- historical aggregates, target cost foundation, and overview dashboard
- Google Drive-backed creative media workflow

## Stack

- Next.js App Router
- Prisma + PostgreSQL
- NextAuth credentials flow
- Docker for local and production deployment

## Local Setup

1. Copy [.env.example](./.env.example) to `.env`
2. Fill in at least:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `APP_BASE_URL`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
   - `INTERNAL_IMPORT_API_KEY`
3. Install dependencies:

```bash
npm install
```

4. Generate the Prisma client:

```bash
npm run prisma:generate
```

5. Apply migrations and seed the first admin:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

6. Start the app:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Local Docker Development

Use the repository root compose file for the real app stack:

```bash
docker compose up --build
```

This starts:
- `app` on port `3000`
- `db` on port `5432`

The development container mounts the current repository, regenerates Prisma on startup, and runs the Next.js dev server against the local Postgres service.

## Production Docker

The production deployment path uses [docker-compose.production.yml](./docker-compose.production.yml):

```bash
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml exec app prisma migrate deploy
docker compose -f docker-compose.production.yml exec app node prisma/seed.cjs
```

## Environment Variables

Core runtime:
- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

Import pipeline:
- `IMPORT_UPLOADS_DIR`
- `INTERNAL_IMPORT_API_KEY`

Telegram digests:
- `CRON_SECRET`
- `TELEGRAM_ALERTS_ENABLED`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_TOPIC_CONVERSIONS_ID`
- `TELEGRAM_TOPIC_NEEDS_REVIEW_ID`
- `TELEGRAM_TOPIC_STRONG_SIGNALS_ID`
- `TELEGRAM_TOPIC_IMPORT_ERRORS_TECH_ID`
- `TELEGRAM_TOPIC_BOT_TEST_ID`

Google Drive:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_DRIVE_OAUTH_REDIRECT_URI`

## Operational Notes

- Manual CSV upload is available inside the protected workspace.
- External upload scripts should use the internal import API key flow.
- Telegram reporting for normal signal topics is digest-based, not event-by-event.
- Creative originals are expected to live in Google Drive or other external storage references; the app is preview-first and link-first by design.
