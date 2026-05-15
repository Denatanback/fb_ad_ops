## Implementation Plan

- Confirm the currently supported CSV import format and document the required columns.
- Extend import processing so stored CSV files are parsed into persisted raw and normalized rows.
- Update import run statuses, counts, and error summaries for parse and normalization outcomes.
- Add lightweight internal visibility for import run details and recent parsing issues.
- Verify build and parsing foundation behavior, then write summary and changed-files reports.
