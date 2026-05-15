# Changed Files

- `package.json` - restored the root package identity, single-app scripts, and the intended Next.js + Prisma dependency surface.
- `tsconfig.json` - restored the real app TypeScript config, including the `@/*` path alias used throughout `src/**`.
- `.env.example` - restored the real FB Ads Ops environment variables for auth, imports, Telegram digests, Google Drive, and PostgreSQL.
- `README.md` - replaced the unrelated monorepo description with setup and runtime instructions for the real internal web service.
- `Dockerfile` - restored a coherent single-app Docker build with `development`, `builder`, and `production` targets.
- `docker-compose.yml` - restored the local dev stack for the real app with `app` + `db` services.
- `recovery_quarantine/2026-03-23_root-scaffold/README.md` - documented the quarantined off-roadmap scaffold contents.
- `recovery_quarantine/2026-03-23_root-scaffold/apps/**` - quarantined unrelated monorepo app packages instead of leaving them in the repository root.
- `recovery_quarantine/2026-03-23_root-scaffold/packages/**` - quarantined unrelated shared package workspace code.
- `recovery_quarantine/2026-03-23_root-scaffold/pnpm-workspace.yaml` - quarantined the foreign workspace root config.
- `recovery_quarantine/2026-03-23_root-scaffold/pnpm-lock.yaml` - quarantined the foreign pnpm lockfile.
- `recovery_quarantine/2026-03-23_root-scaffold/docs/plans/step-001.md` - quarantined the non-timestamped off-roadmap plan file.
- `recovery_quarantine/2026-03-23_root-scaffold/tsconfig.base.json` - quarantined the scaffold TypeScript base config no longer used by the restored app root.
