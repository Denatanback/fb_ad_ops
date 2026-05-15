# Step 22 — Critical Hardening Pass

**Date:** 2026-03-20
**Scope:** Targeted security and reliability fixes based on full audit findings.
**Constraint:** No new infra deps, no async workers, no nav redesign, no secret rotation — only scrub tracked files and add guardrails.

---

## Goals

| # | Goal | Status |
|---|------|--------|
| 1 | Remove real secrets from `.env.example` | Done |
| 2 | Enforce admin-only access on admin pages/actions | Already in place (verified) |
| 3 | Add file-size guardrails on CSV and creative uploads | Done |
| 4 | Capture `uploadedById` on manual imports | Already in place (verified) |
| 5 | Fix root `/` landing page | Already in place (verified) |
| 6 | Fix `lang="en"` → `lang="ru"` on root layout | Done |

---

## Findings During Implementation

Three items from the audit were already resolved in the codebase by the time implementation began:

- **Admin role checks**: All three admin pages (`notifications`, `analyzer-rules`, `google-drive`) and the `analyzer-rules/actions.ts` already call `requireRole("admin")`.
- **`uploadedById`**: `src/app/(workspace)/imports/actions.ts` already passes `session.user.id`.
- **Root page**: `src/app/(workspace)/page.tsx` already exists as a dashboard with navigation shortcuts.

## Changes Made

1. **`.env.example`** — Replaced all real credentials (Google OAuth client ID/secret, Telegram bot token, admin email/password, chat IDs, folder IDs) with safe placeholder values.

2. **`src/server/imports/storage.ts`** — Added `MAX_IMPORT_FILE_SIZE` constant (50 MB) and early size check before reading file into memory in `storeUploadedImportFile()`.

3. **`src/app/(workspace)/creatives/actions.ts`** — Added `MAX_CREATIVE_FILE_SIZE` constant (200 MB) and early size check in `uploadCreativeSourceFile()` before buffering and uploading to Google Drive.

4. **`src/app/layout.tsx`** — Changed `lang="en"` to `lang="ru"` to match the Russian-language UI.

## Build Verification

`next build` completes successfully with zero errors after all changes.
