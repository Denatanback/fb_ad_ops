CREATE TYPE "import_mode" AS ENUM ('daily_manual', 'bulk_historical');

ALTER TABLE "import_runs"
ADD COLUMN "import_mode" "import_mode" NOT NULL DEFAULT 'daily_manual';

CREATE INDEX "import_runs_import_mode_idx" ON "import_runs"("import_mode");
