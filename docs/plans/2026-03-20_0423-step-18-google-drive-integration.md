# Step 18 Plan

1. Add a small Prisma foundation for one admin-controlled Google Drive integration plus external media references on creatives.
2. Implement a protected internal Google OAuth connect/callback flow for Drive using env-based credentials and a configured My Drive target folder.
3. Add a reusable server-side Google Drive upload service and a simple admin integration status page.
4. Extend creative media handling to store Drive-backed external references without introducing server-side original-file storage by default.
5. Verify build and schema generation as far as practical, then write summary and changed-files reports.
