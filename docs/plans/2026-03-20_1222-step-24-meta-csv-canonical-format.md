## Step 24 Plan

- Replace the canonical CSV parser schema with the real Meta Ads export columns now used in production workflows.
- Update normalization and import error messaging so `Reporting starts` / `Reporting ends` become the supported date fields and metric semantics stay honest.
- Refresh import-facing docs and run verification for parser/build compatibility without touching unrelated UI or analyzer architecture.
