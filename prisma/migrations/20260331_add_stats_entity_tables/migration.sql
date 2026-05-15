-- CreateTable
CREATE TABLE "stats_entity_daily" (
    "id" TEXT NOT NULL,
    "entity_key" TEXT NOT NULL,
    "import_level" "import_level" NOT NULL,
    "campaign_id" TEXT,
    "ad_set_id" TEXT,
    "ad_id" TEXT,
    "campaign_name" TEXT,
    "adset_name" TEXT,
    "ad_name" TEXT,
    "approach_name" TEXT,
    "date" DATE NOT NULL,
    "spend" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "results" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "normalized_payload" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_entity_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_entity_cumulative" (
    "id" TEXT NOT NULL,
    "entity_key" TEXT NOT NULL,
    "import_level" "import_level" NOT NULL,
    "campaign_id" TEXT,
    "ad_set_id" TEXT,
    "ad_id" TEXT,
    "campaign_name" TEXT,
    "adset_name" TEXT,
    "ad_name" TEXT,
    "approach_name" TEXT,
    "total_spend" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "total_results" INTEGER NOT NULL DEFAULT 0,
    "total_impressions" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "normalized_payload" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_entity_cumulative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stats_entity_daily_entity_key_key" ON "stats_entity_daily"("entity_key");
CREATE INDEX "stats_entity_daily_import_level_idx" ON "stats_entity_daily"("import_level");

-- CreateIndex
CREATE UNIQUE INDEX "stats_entity_cumulative_entity_key_key" ON "stats_entity_cumulative"("entity_key");
CREATE INDEX "stats_entity_cumulative_import_level_idx" ON "stats_entity_cumulative"("import_level");
