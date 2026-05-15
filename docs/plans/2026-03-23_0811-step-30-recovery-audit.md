# Recovery Audit Plan

## Goal
Perform an audit-only forensic pass to determine whether this repository contains likely-unintended drift, using:
- `docs/plans`
- `docs/summary`
- `docs/changed_files`

as the expected source of truth for intended implementation history.

## Audit scope
- Current project tree and top-level runtime files
- Current `src/`, `prisma/`, and documented product areas
- Timestamped implementation reports in `docs/plans`, `docs/summary`, and `docs/changed_files`
- Obvious mismatches between documented roadmap work and current repository bootstrap/runtime shape

## Expected outcome
- Grounded list of suspicious files/modules
- Clear list of likely safe areas
- Severity estimate for recovery
- Recommended restore strategy

## Constraints
- No code edits
- No cleanup
- No speculative rollback
- Evidence-first conclusions only
