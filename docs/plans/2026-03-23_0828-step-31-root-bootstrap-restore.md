# Implementation Plan

## Goal
Restore the repository root so it represents the intended single Facebook Ads operations web service again, while preserving the healthy application code in `src/**`, `prisma/**`, and timestamped docs.

## Scope
- Rebuild the root bootstrap/runtime files: `package.json`, `README.md`, `.env.example`, `Dockerfile`, `docker-compose.yml`
- Quarantine unrelated monorepo contamination: `apps/**`, `packages/**`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `docs/plans/step-001.md`
- Keep the actual app code intact unless a tiny root-coordination adjustment is strictly necessary

## Steps
1. Confirm the intended root baseline from the existing app code, `package-lock.json`, and timestamped implementation reports.
2. Restore the root-level bootstrap files so they point to the single Next.js + Prisma service already living in this repository.
3. Quarantine unrelated monorepo scaffold files/directories into a recovery folder instead of deleting them outright.
4. Verify the restored root with the most relevant safe checks and write completion reports.
