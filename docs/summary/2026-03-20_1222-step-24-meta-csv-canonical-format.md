## Step 24 Summary

- Replaced the old canonical CSV contract with the real Meta Ads ad-level export schema now used by the team: `meta_ads_ad_level_export_v1`.
- Updated import validation, normalization, sample fixture, and user-facing documentation to use `Reporting starts` / `Reporting ends` instead of `Day` and to map `Clicks (all)` / `CPC (all) (USD)` honestly into the normalized pipeline.
- Preserved analyzer compatibility by keeping the existing normalized metric fields, adding explicit `metricsSemantics` metadata, and loosening budget/naming parsing so real Meta exports import without manual cleanup.
- Verified the parser against both the new sample fixture and a real uploaded Meta CSV from `storage/imports`, then re-ran `next build`.
