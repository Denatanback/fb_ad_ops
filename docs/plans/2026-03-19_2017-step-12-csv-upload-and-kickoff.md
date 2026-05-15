# Plan

- Add a protected CSV upload route with env-based server-to-server authentication, local server-side file storage, and ImportRun creation.
- Add import processing kickoff helpers that move a new import run into processing readiness and record failures cleanly without implementing CSV parsing yet.
- Add lightweight internal visibility for recent import runs, update docs/env examples, verify build/route compilation, and write the required summary and changed-files reports.
