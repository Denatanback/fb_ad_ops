# Changed Files — Step 22: Critical Hardening Pass

**Date:** 2026-03-20

## Modified Files

| File | Lines Changed | Description |
|------|--------------|-------------|
| `.env.example` | ~32 | Replaced real secrets with placeholder values |
| `src/server/imports/storage.ts` | +5 | Added `MAX_IMPORT_FILE_SIZE` (50 MB) constant and size check |
| `src/app/(workspace)/creatives/actions.ts` | +6 | Added `MAX_CREATIVE_FILE_SIZE` (200 MB) constant and size check |
| `src/app/layout.tsx` | 1 | Changed `lang="en"` to `lang="ru"` |

## New Files

| File | Description |
|------|-------------|
| `docs/plans/2026-03-20_1400-step-22-critical-hardening-pass.md` | Implementation plan and findings |
| `docs/summary/2026-03-20_1400-critical-hardening-pass.md` | Condensed summary |
| `docs/changed_files/2026-03-20_1400-step-22-critical-hardening-pass.md` | This file |
