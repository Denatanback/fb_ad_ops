## Changed Files

- `docs/plans/2026-03-20_1341-step-25-import-diagnostics-and-upload-pending.md` - added the implementation plan for diagnostics, upload pending UX, and minimal historical foundation work.
- `src/server/services/import-runs.ts` - extended import-run loading with grouped alert/delivery diagnostics and cumulative historical-base summary queries.
- `src/app/(workspace)/imports/page.tsx` - replaced the inline upload form with the new pending-aware manual upload component and kept the imports list compact.
- `src/components/imports/manual-import-upload-form.tsx` - added a small client upload form that disables file input and submit while a CSV upload is pending.
- `src/app/(workspace)/imports/[importRunId]/page.tsx` - restructured the import detail UI around compact operational diagnostics, route breakdowns, delivery outcomes, and historical-base visibility.
- `src/app/globals.css` - added minimal disabled-button and disabled-fieldset styling for pending upload UX.
- `README.md` - documented the new import diagnostics visibility, pending upload behavior, and cumulative import-history note.
- `docs/product/analyzer.md` - clarified that normalized import data already forms a cumulative base for future historical analysis and that import details now expose alert/delivery diagnostics.
- `docs/summary/2026-03-20_1341-step-25-import-diagnostics-and-upload-pending.md` - added the task completion summary.
