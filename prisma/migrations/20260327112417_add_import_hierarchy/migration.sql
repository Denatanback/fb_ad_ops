-- CreateEnum
CREATE TYPE "import_level" AS ENUM ('campaign', 'ad_set', 'ad');

-- AlterTable
ALTER TABLE "import_normalized_rows" ADD COLUMN     "ad_id" TEXT,
ADD COLUMN     "ad_set_id" TEXT,
ADD COLUMN     "campaign_id" TEXT,
ADD COLUMN     "import_level" "import_level" NOT NULL DEFAULT 'ad';

-- AlterTable
ALTER TABLE "import_runs" ADD COLUMN     "ad_set_file_hash" TEXT,
ADD COLUMN     "ad_set_file_storage_key" TEXT,
ADD COLUMN     "campaign_file_hash" TEXT,
ADD COLUMN     "campaign_file_storage_key" TEXT;

-- CreateIndex
CREATE INDEX "import_normalized_rows_campaign_id_idx" ON "import_normalized_rows"("campaign_id");

-- CreateIndex
CREATE INDEX "import_normalized_rows_ad_set_id_idx" ON "import_normalized_rows"("ad_set_id");

-- CreateIndex
CREATE INDEX "import_normalized_rows_import_level_idx" ON "import_normalized_rows"("import_level");
