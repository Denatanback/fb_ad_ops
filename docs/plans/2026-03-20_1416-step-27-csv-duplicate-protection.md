## Implementation Plan

1. Add minimal duplicate-protection persistence so identical CSV uploads are blocked by stable file hash before a second effective import run can start.
2. Update the upload/intake flow to compute duplicate metadata, detect existing imports idempotently, and prevent repeated analyzer/Telegram execution for the same CSV content.
3. Expose a clear duplicate result in the existing imports UI/API responses, then update docs and verify Prisma/build behavior.
