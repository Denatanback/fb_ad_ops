# Step 23 — Production Deploy Readiness

**Date:** 2026-03-20
**Scope:** Add a proper production Docker path and operator documentation.

---

## Situation Before

- Dockerfile had only a `development` target (runs `next dev`)
- No `next build` or standalone output configured
- No production compose file
- README only documented local development
- `.dockerignore` was minimal

## Goals

1. Add production stages to Dockerfile (builder + runner with Next.js standalone)
2. Enable `output: "standalone"` in Next.js config
3. Create a production Docker Compose file
4. Update `.dockerignore` for cleaner production builds
5. Document production deploy workflow and required env vars in README
6. Verify the Docker production build succeeds

## Approach

- Multi-stage Dockerfile: `base → deps → builder → production`
- Builder stage runs `next build` with standalone output
- Production stage copies only standalone output, static assets, Prisma schema, and seed script
- Non-root `nextjs` user (uid 1001) for runtime security
- Prisma CLI installed globally in production image for `migrate deploy`
- Separate `docker-compose.production.yml` targeting the `production` stage
- Upload storage persisted via Docker volume at `/app/storage`

## Constraints Followed

- No architecture changes
- No route/UI changes
- No new infra dependencies
- Existing development path untouched
- Existing app behavior preserved
