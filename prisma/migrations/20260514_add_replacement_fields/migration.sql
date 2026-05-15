-- Stage 3: CSV replacement fields on import_runs and import_normalized_rows
-- Run after: 20260514_add_ad_accounts

-- ── import_runs ─────────────────────────────────────────────────────────────

-- New columns
ALTER TABLE "import_runs" ADD COLUMN IF NOT EXISTS "ad_account_id" TEXT;
ALTER TABLE "import_runs" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "import_runs" ADD COLUMN IF NOT EXISTS "replaced_at" TIMESTAMPTZ;
ALTER TABLE "import_runs" ADD COLUMN IF NOT EXISTS "replaced_by_import_run_id" TEXT;

-- Drop the global unique constraint on source_file_hash (replaced by per-cabinet check in app code)
ALTER TABLE "import_runs" DROP CONSTRAINT IF EXISTS "import_runs_source_file_hash_key";

-- Indexes
CREATE INDEX IF NOT EXISTS "import_runs_source_file_hash_idx"        ON "import_runs"("source_file_hash");
CREATE INDEX IF NOT EXISTS "import_runs_ad_account_id_idx"            ON "import_runs"("ad_account_id");
CREATE INDEX IF NOT EXISTS "import_runs_is_active_idx"                ON "import_runs"("is_active");

-- FK: ad_account_id → ad_accounts.id
ALTER TABLE "import_runs"
  ADD CONSTRAINT "import_runs_ad_account_id_fkey"
  FOREIGN KEY ("ad_account_id") REFERENCES "ad_accounts"("id") ON DELETE SET NULL;

-- FK: replaced_by_import_run_id → import_runs.id (self-relation)
ALTER TABLE "import_runs"
  ADD CONSTRAINT "import_runs_replaced_by_import_run_id_fkey"
  FOREIGN KEY ("replaced_by_import_run_id") REFERENCES "import_runs"("id") ON DELETE SET NULL;

-- ── import_normalized_rows ───────────────────────────────────────────────────

ALTER TABLE "import_normalized_rows" ADD COLUMN IF NOT EXISTS "ad_account_id" TEXT;
ALTER TABLE "import_normalized_rows" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;

-- Composite index for the replacement query (adAccountId + reportDate + importLevel + isActive)
CREATE INDEX IF NOT EXISTS "import_normalized_rows_account_date_level_active_idx"
  ON "import_normalized_rows"("ad_account_id", "report_date", "import_level", "is_active");

CREATE INDEX IF NOT EXISTS "import_normalized_rows_is_active_idx"
  ON "import_normalized_rows"("is_active");
