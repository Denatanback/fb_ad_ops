# Analyzer And Alerts

## Purpose
- A separate script will later export Facebook Ads statistics as CSV and upload them to this server.
- After upload, the server should automatically start an internal processing flow instead of relying on manual follow-up steps.
- The goal is to produce transparent rankings, alert candidates, and shared-team notifications without turning the system into a black box.

## Intended future flow
1. CSV file is uploaded to the internal web service.
2. An import record is created for traceability.
3. Background processing starts for that import.
4. The analyzer groups analogous campaigns and computes rankings.
5. Alert candidates are created with confidence and maturity context.
6. Alerts are persisted for later review inside the system.
7. Telegram notifications are sent to the shared chat when policy allows.

## Persistence foundation
- Keep import tracking explicit with an import-run record plus row-level storage.
- Keep both raw imported rows and normalized analyzer-ready rows so troubleshooting and reprocessing stay possible later.
- Persist analyzer comparison groups and analyzer result rows separately from alert events.
- Persist notification deliveries separately from alert events so Telegram send attempts, failures, and destinations can be audited without mutating the alert itself.
- Treat import runs as cumulative persisted data sources, not disposable one-off uploads.
- The current historical foundation now supports cumulative aggregation over completed normalized rows by:
  - approach
  - campaign
  - optional report-date range
- Current historical aggregate outputs already expose:
  - spend
  - results
  - CPA / cost per result
  - outbound CTR
  - CPLPV
  - campaign counts and import-row counts where relevant
  - all-time signal counts where the persisted alert model can resolve them honestly
- The current analyzer still decides per import run, but future history-aware logic can now use the shared aggregate/query layer instead of starting from isolated CSV assumptions.

## Upload and kickoff foundation
- The external CSV export script should authenticate server-to-server and upload files to a dedicated internal endpoint.
- For MVP, local server-side file storage is acceptable as long as the storage path remains controlled and documented.
- After upload, the system should create the import run and immediately kick off the first processing stage foundation.
- The current foundation now parses one supported CSV format, persists raw rows plus normalized rows, records row-level issues for internal review, and then starts the first analyzer/watchdog execution pass automatically.
- Duplicate upload protection now uses a stable file hash as the primary idempotency signal, so identical CSV files do not create a second effective import run or rerun the analyzer/Telegram chain.

## Current supported CSV format
- Support exactly one format for now: `meta_ads_ad_level_export_v1`.
- Required columns:
  - `Ad name`
  - `Ad delivery`
  - `Results`
  - `Result indicator`
  - `Cost per results`
  - `Ad set budget`
  - `Ad set budget type`
  - `Amount spent (USD)`
  - `Impressions`
  - `Reach`
  - `Clicks (all)`
  - `CPC (all) (USD)`
  - `CTR (link click-through rate)`
  - `Outbound CTR (click-through rate)`
  - `Cost per landing page view (USD)`
  - `CPM (cost per 1,000 impressions) (USD)`
  - `Ad set name`
  - `Ad set ID`
  - `Campaign name`
  - `Campaign ID`
  - `Reporting starts`
  - `Reporting ends`
  - `Ad set delivery`
- `Reporting starts` and `Reporting ends` should use `YYYY-MM-DD`.
- The normalized import model now treats:
  - `clicks` as `Clicks (all)`
  - `cpc` as `CPC (all) (USD)`
  - `ctr` as `CTR (link click-through rate)`
  - `costPerResult` as `Cost per results`
  - `outboundCtr` as `Outbound CTR (click-through rate)`
  - `cplpv` as `Cost per landing page view (USD)`
- `reportDate` is taken from `Reporting starts`, and the full reporting window is preserved in the normalized payload for downstream debugging and future analytics.
- Current naming preparation still tries to read `Approach | Group | ...` from `Campaign name` using the `|` delimiter, but this is only preparation for future comparison-group logic, not the analyzer itself.

## Comparison logic direction
- Comparisons should happen inside analogous groups, for example a funnel or other shared global naming group within an Approach.
- The analyzer should stay aware of whether real results exist.
- When results exist, ranking should weigh result-bearing efficiency more heavily.
- When results do not exist yet, ranking can fall back to proxy metrics, but the output should clearly say that it is proxy-mode evaluation.
- The current first pass groups imported rows by approach-like naming plus global/comparison group key derived from the imported campaign structure.
- Imported CSV data now preserves ad set budget fields and budget type from Meta export, but it still does not safely identify launch-level ABO/CBO mode on its own, so analyzer grouping does not split ABO/CBO yet even though the core product model keeps budget mode at the launch level.

## Rules and thresholds foundation
- The current configuration layer supports both future relative benchmark logic and future manual watchdog guardrails, but only the guardrail configuration is implemented right now.
- Initial configurable rules:
  - `outbound_ctr`
  - `cplpv`
  - `spend_no_results_creative`
  - `spend_no_results_adset`
- Override precedence is:
  1. global default
  2. approach override
  3. funnel override
- Each rule can carry enabled state, severity, topic bucket, reason code, and threshold fields appropriate to that rule.
- Current watchdog-oriented rules are expected to route primarily into `needs_review`, while still staying compatible with the broader Telegram topic model.

## Target cost foundation
- The system now has an explicit target-cost source of truth for `cost per result` / target CPA in USD.
- Supported scopes:
  1. global default
  2. approach override
  3. funnel override
- Override precedence is `global -> approach -> funnel`.
- The target-cost foundation is intentionally simple:
  - one target value in USD
  - short notes for operational context
  - no recommendation engine yet
- This source of truth is meant for:
  - future analyzer recommendation logic
  - dashboard summaries
  - status-vs-target reporting for approaches and campaigns

## Alerting direction
- Conversion arrival signals should be supported.
- Suspicious fast-spend or pacing anomalies should be supported.
- Weak metrics should only alert after sufficient maturity or sample gates.
- Result-aware weak-performance alerts should be separate from proxy-mode weak signals.
- Strong opportunity or review signals should only fire when the evidence is strong enough to justify attention.

## First live analyzer pass
- The current import pipeline already executes a first transparent analyzer pass after normalization.
- It persists:
  - comparison groups
  - analyzer results
  - alert events
  - notification delivery attempts
- It currently supports:
  - `proxy_mode` when a subject has no results
  - `results_aware` when results exist
  - simple maturity gates based on spend, clicks, impressions, or results
  - simple confidence markers: `low`, `medium`, `high`
  - manual rule checks for `outbound_ctr`, `cplpv`, `spend_no_results_creative`, and `spend_no_results_adset`
  - alert buckets for `conversions`, `needs_review`, `strong_signals`, and `import_errors_tech`
- `needs_review` remains one action topic and includes reason codes directly in the alert payload and Telegram message.
- The import detail UI now exposes compact diagnostics from persisted records, including alert counts, delivery counts, topic routing, and saved skip/fail reasons where the current delivery layer recorded them.

## Dashboard-ready aggregate direction
- The current server layer now prepares dashboard-ready summaries without adding a full dashboard UI yet.
- Approach-level summaries are ready to expose:
  - approach name
  - total spend
  - total results
  - CPA
  - outbound CTR
  - CPLPV
  - campaign count
  - target cost
  - status vs target
- Campaign-level summaries are ready to expose:
  - campaign name
  - approach
  - spend
  - results
  - CPA
  - outbound CTR
  - CPLPV
  - budget context when it can be inferred from imported Meta budget type
  - target cost
  - status vs target
- Current signal counts in this aggregate layer are intentionally conservative and only included where the persisted analyzer/alert records can be matched honestly.

## Telegram routing direction
- Telegram delivery should target a forum supergroup, not one flat shared chat stream.
- Preferred routing buckets are:
  - `conversions`
  - `needs_review`
  - `strong_signals`
  - `import_errors_tech`
  - `bot_test`
- The `needs_review` bucket stays in one Telegram topic and carries reason codes such as `spend_anomaly`, `weak_metrics`, `result_weakness`, and `mixed_signal`.
- Chat IDs, bot tokens, and topic/thread IDs must stay in environment-based configuration only.

## Trust and anti-noise rules
- Each alert candidate should carry a confidence level.
- Maturity gates should be explicit so low-sample noise is reduced.
- Cooldown behavior is required later so the same issue does not spam the shared chat.
- Ranking and alert outputs should remain inspectable so teammates can understand why a signal was produced.

## Still intentionally unimplemented
- Full CSV upload validation beyond the single supported format.
- Cooldown and anti-spam behavior across imports.
- More advanced relative benchmark logic beyond the first transparent MVP scoring pass.
- Full history-first analyzer decisions that compare current subjects against historical baselines instead of only the current import run.
- Target-based recommendation logic, automated recommended thresholds, and broader overview dashboard UI.
