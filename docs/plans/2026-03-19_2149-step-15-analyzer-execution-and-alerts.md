## Implementation Plan

- Define a transparent first-pass analyzer model for grouping normalized rows, selecting evaluation mode, and applying maturity plus confidence rules.
- Implement analyzer execution services that persist comparison groups, analyzer results, alert events, and notification deliveries.
- Wire analyzer execution into the import processing flow after normalization completes.
- Extend the import detail visibility so internal users can inspect analyzer status, alerts, and summary signals.
- Verify build and protected-route behavior, then write summary and changed-files reports.
