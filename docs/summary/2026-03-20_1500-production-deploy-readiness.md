# Production Deploy Readiness — Summary

**Date:** 2026-03-20
**Full plan:** `docs/plans/2026-03-20_1500-step-23-production-deploy-readiness.md`

---

## What Changed

| File | Change |
|------|--------|
| `next.config.mjs` | Added `output: "standalone"` for self-contained production builds |
| `Dockerfile` | Added `builder` and `production` stages (multi-stage build with non-root user) |
| `docker-compose.production.yml` | New file — production compose targeting the `production` Dockerfile stage |
| `.dockerignore` | Expanded to exclude docs, storage, compose files, and markdown from build context |
| `README.md` | Added "Production Deployment (Docker)" section with deploy steps, required env vars, and image details |

## Verification

- `next build` succeeds with standalone output
- `docker build --target production` succeeds (152 MB image)
- Production image contains: `server.js`, `.next/static/`, `prisma/`, `package.json` — all owned by `nextjs:nodejs`
- Prisma CLI available globally for runtime `migrate deploy`
- Development path (`docker-compose.yml` with `development` target) untouched

## Known Next Follow-ups

- Health check endpoint (`/api/health` already exists but not wired into compose healthcheck)
- Container startup script to auto-run `prisma migrate deploy` before `node server.js`
- Reverse proxy / TLS termination docs (nginx, Caddy, etc.)
- CI/CD pipeline for automated builds
- Environment validation at app startup
