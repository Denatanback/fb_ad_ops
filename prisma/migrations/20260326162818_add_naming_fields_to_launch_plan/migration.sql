-- AlterTable
ALTER TABLE "creatives" ADD COLUMN     "preview_data" TEXT,
ALTER COLUMN "approach_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "import_normalized_rows" ADD COLUMN     "interval_clicks" INTEGER,
ADD COLUMN     "interval_impressions" INTEGER,
ADD COLUMN     "interval_results" INTEGER,
ADD COLUMN     "interval_spend" DECIMAL(12,4),
ADD COLUMN     "previous_row_id" TEXT;

-- CreateTable
CREATE TABLE "launch_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "lifecycle_status" NOT NULL DEFAULT 'queue',
    "budget_mode" "budget_mode" NOT NULL,
    "budget" DECIMAL(10,2) NOT NULL,
    "campaigns_count" INTEGER NOT NULL,
    "adsets_count" INTEGER NOT NULL,
    "creatives_count" INTEGER NOT NULL,
    "approach_id" TEXT,
    "naming_label" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launch_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launch_plan_items" (
    "id" TEXT NOT NULL,
    "launch_plan_id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "campaign_naming" TEXT NOT NULL,
    "adset_naming" TEXT NOT NULL,
    "creative_naming" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "launch_plans_approach_id_idx" ON "launch_plans"("approach_id");

-- CreateIndex
CREATE INDEX "launch_plans_created_by_id_idx" ON "launch_plans"("created_by_id");

-- CreateIndex
CREATE INDEX "launch_plans_updated_by_id_idx" ON "launch_plans"("updated_by_id");

-- CreateIndex
CREATE INDEX "launch_plans_status_idx" ON "launch_plans"("status");

-- CreateIndex
CREATE INDEX "launch_plan_items_launch_plan_id_idx" ON "launch_plan_items"("launch_plan_id");

-- CreateIndex
CREATE INDEX "launch_plan_items_creative_id_idx" ON "launch_plan_items"("creative_id");

-- CreateIndex
CREATE INDEX "import_normalized_rows_previous_row_id_idx" ON "import_normalized_rows"("previous_row_id");

-- AddForeignKey
ALTER TABLE "launch_plans" ADD CONSTRAINT "launch_plans_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_plans" ADD CONSTRAINT "launch_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_plans" ADD CONSTRAINT "launch_plans_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_plan_items" ADD CONSTRAINT "launch_plan_items_launch_plan_id_fkey" FOREIGN KEY ("launch_plan_id") REFERENCES "launch_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_plan_items" ADD CONSTRAINT "launch_plan_items_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_normalized_rows" ADD CONSTRAINT "import_normalized_rows_previous_row_id_fkey" FOREIGN KEY ("previous_row_id") REFERENCES "import_normalized_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
