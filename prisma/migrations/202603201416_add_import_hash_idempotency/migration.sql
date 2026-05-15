ALTER TABLE "import_runs"
ADD COLUMN "source_format_key" TEXT,
ADD COLUMN "reporting_window_start" TIMESTAMP(3),
ADD COLUMN "reporting_window_end" TIMESTAMP(3);

DROP INDEX IF EXISTS "import_runs_source_file_hash_idx";
CREATE UNIQUE INDEX "import_runs_source_file_hash_key" ON "import_runs"("source_file_hash");
