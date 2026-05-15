# Step 20 Plan

- Review the current shell, dashboard, imports pages, and form patterns to identify where explanatory chrome and oversized navigation elements can be reduced without changing the product structure.
- Add a shared import-intake helper so both the existing API upload route and a new protected in-app manual CSV upload flow use the same backend pipeline.
- Simplify the shell, dashboard, and imports UI into a more compact internal-tool layout, fix select readability in dark/light mode, and remove the invalid server-action form attribute that causes the encType warning.
- Verify the app still builds, confirm the affected flow no longer uses the invalid form setup, and create the required summary and changed-files reports.
