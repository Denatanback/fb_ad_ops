-- CreateEnum
CREATE TYPE "import_source_type" AS ENUM ('csv_upload');

-- CreateEnum
CREATE TYPE "import_run_status" AS ENUM ('received', 'parsing', 'normalizing', 'analyzing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "analyzer_evaluation_mode" AS ENUM ('results_aware', 'proxy_mode');

-- CreateEnum
CREATE TYPE "analyzer_confidence_level" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "analyzer_alert_kind" AS ENUM ('conversion_arrival', 'spend_pacing_risk', 'weak_performance', 'opportunity_review', 'import_error_tech');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('telegram');

-- CreateEnum
CREATE TYPE "notification_delivery_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "import_runs" (
    "id" TEXT NOT NULL,
    "source_type" "import_source_type" NOT NULL DEFAULT 'csv_upload',
    "source_filename" TEXT NOT NULL,
    "source_storage_key" TEXT,
    "source_file_hash" TEXT,
    "source_content_type" TEXT,
    "source_byte_size" INTEGER,
    "processing_status" "import_run_status" NOT NULL DEFAULT 'received',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_started_at" TIMESTAMP(3),
    "processing_finished_at" TIMESTAMP(3),
    "analyzer_started_at" TIMESTAMP(3),
    "analyzer_finished_at" TIMESTAMP(3),
    "raw_rows_count" INTEGER NOT NULL DEFAULT 0,
    "normalized_rows_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "error_details" JSONB,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_raw_rows" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "row_hash" TEXT,
    "raw_payload" JSONB NOT NULL,
    "parse_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_raw_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_normalized_rows" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "raw_row_id" TEXT,
    "source_row_number" INTEGER,
    "report_date" TIMESTAMP(3),
    "approach_name" TEXT,
    "campaign_name" TEXT,
    "adset_name" TEXT,
    "ad_name" TEXT,
    "global_group_key" TEXT,
    "comparison_group_key" TEXT,
    "has_results" BOOLEAN NOT NULL DEFAULT false,
    "results" INTEGER,
    "spend" DECIMAL(12,4),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "cpc" DECIMAL(12,4),
    "ctr" DECIMAL(12,4),
    "cpm" DECIMAL(12,4),
    "cost_per_result" DECIMAL(12,4),
    "normalized_payload" JSONB NOT NULL,
    "normalization_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_normalized_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyzer_comparison_groups" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "approach_id" TEXT,
    "group_key" TEXT NOT NULL,
    "group_label" TEXT NOT NULL,
    "global_group_key" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "result_row_count" INTEGER NOT NULL DEFAULT 0,
    "evaluation_mode" "analyzer_evaluation_mode" NOT NULL,
    "confidence_level" "analyzer_confidence_level",
    "maturity_reached" BOOLEAN NOT NULL DEFAULT false,
    "maturity_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyzer_comparison_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyzer_results" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "comparison_group_id" TEXT NOT NULL,
    "normalized_row_id" TEXT,
    "subject_key" TEXT NOT NULL,
    "subject_label" TEXT NOT NULL,
    "rank" INTEGER,
    "score" DECIMAL(12,4),
    "evaluation_mode" "analyzer_evaluation_mode" NOT NULL,
    "confidence_level" "analyzer_confidence_level" NOT NULL,
    "maturity_reached" BOOLEAN NOT NULL DEFAULT false,
    "results_present" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "result_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyzer_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT NOT NULL,
    "comparison_group_id" TEXT,
    "analyzer_result_id" TEXT,
    "kind" "analyzer_alert_kind" NOT NULL,
    "severity" "alert_severity" NOT NULL DEFAULT 'warning',
    "reason_code" TEXT,
    "evaluation_mode" "analyzer_evaluation_mode",
    "confidence_level" "analyzer_confidence_level",
    "maturity_reached" BOOLEAN NOT NULL DEFAULT false,
    "cooldown_key" TEXT,
    "destination_topic_key" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "alert_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT,
    "alert_event_id" TEXT,
    "channel" "notification_channel" NOT NULL DEFAULT 'telegram',
    "delivery_status" "notification_delivery_status" NOT NULL DEFAULT 'pending',
    "destination_topic_key" TEXT,
    "telegram_chat_id" TEXT,
    "telegram_thread_id" INTEGER,
    "attempted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_runs_processing_status_idx" ON "import_runs"("processing_status");

-- CreateIndex
CREATE INDEX "import_runs_received_at_idx" ON "import_runs"("received_at");

-- CreateIndex
CREATE INDEX "import_runs_uploaded_by_id_idx" ON "import_runs"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "import_runs_source_file_hash_idx" ON "import_runs"("source_file_hash");

-- CreateIndex
CREATE INDEX "import_raw_rows_row_hash_idx" ON "import_raw_rows"("row_hash");

-- CreateIndex
CREATE UNIQUE INDEX "import_raw_rows_import_run_id_row_number_key" ON "import_raw_rows"("import_run_id", "row_number");

-- CreateIndex
CREATE INDEX "import_normalized_rows_import_run_id_idx" ON "import_normalized_rows"("import_run_id");

-- CreateIndex
CREATE INDEX "import_normalized_rows_raw_row_id_idx" ON "import_normalized_rows"("raw_row_id");

-- CreateIndex
CREATE INDEX "import_normalized_rows_comparison_group_key_idx" ON "import_normalized_rows"("comparison_group_key");

-- CreateIndex
CREATE INDEX "import_normalized_rows_global_group_key_idx" ON "import_normalized_rows"("global_group_key");

-- CreateIndex
CREATE INDEX "import_normalized_rows_report_date_idx" ON "import_normalized_rows"("report_date");

-- CreateIndex
CREATE INDEX "analyzer_comparison_groups_approach_id_idx" ON "analyzer_comparison_groups"("approach_id");

-- CreateIndex
CREATE INDEX "analyzer_comparison_groups_global_group_key_idx" ON "analyzer_comparison_groups"("global_group_key");

-- CreateIndex
CREATE INDEX "analyzer_comparison_groups_evaluation_mode_idx" ON "analyzer_comparison_groups"("evaluation_mode");

-- CreateIndex
CREATE UNIQUE INDEX "analyzer_comparison_groups_import_run_id_group_key_key" ON "analyzer_comparison_groups"("import_run_id", "group_key");

-- CreateIndex
CREATE INDEX "analyzer_results_import_run_id_idx" ON "analyzer_results"("import_run_id");

-- CreateIndex
CREATE INDEX "analyzer_results_normalized_row_id_idx" ON "analyzer_results"("normalized_row_id");

-- CreateIndex
CREATE INDEX "analyzer_results_evaluation_mode_confidence_level_idx" ON "analyzer_results"("evaluation_mode", "confidence_level");

-- CreateIndex
CREATE UNIQUE INDEX "analyzer_results_comparison_group_id_subject_key_key" ON "analyzer_results"("comparison_group_id", "subject_key");

-- CreateIndex
CREATE INDEX "alert_events_import_run_id_idx" ON "alert_events"("import_run_id");

-- CreateIndex
CREATE INDEX "alert_events_comparison_group_id_idx" ON "alert_events"("comparison_group_id");

-- CreateIndex
CREATE INDEX "alert_events_analyzer_result_id_idx" ON "alert_events"("analyzer_result_id");

-- CreateIndex
CREATE INDEX "alert_events_kind_severity_idx" ON "alert_events"("kind", "severity");

-- CreateIndex
CREATE INDEX "alert_events_destination_topic_key_idx" ON "alert_events"("destination_topic_key");

-- CreateIndex
CREATE INDEX "alert_events_reason_code_idx" ON "alert_events"("reason_code");

-- CreateIndex
CREATE INDEX "notification_deliveries_import_run_id_idx" ON "notification_deliveries"("import_run_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_alert_event_id_idx" ON "notification_deliveries"("alert_event_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_delivery_status_idx" ON "notification_deliveries"("channel", "delivery_status");

-- CreateIndex
CREATE INDEX "notification_deliveries_destination_topic_key_idx" ON "notification_deliveries"("destination_topic_key");

-- AddForeignKey
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_raw_rows" ADD CONSTRAINT "import_raw_rows_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_normalized_rows" ADD CONSTRAINT "import_normalized_rows_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_normalized_rows" ADD CONSTRAINT "import_normalized_rows_raw_row_id_fkey" FOREIGN KEY ("raw_row_id") REFERENCES "import_raw_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyzer_comparison_groups" ADD CONSTRAINT "analyzer_comparison_groups_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyzer_comparison_groups" ADD CONSTRAINT "analyzer_comparison_groups_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyzer_results" ADD CONSTRAINT "analyzer_results_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyzer_results" ADD CONSTRAINT "analyzer_results_comparison_group_id_fkey" FOREIGN KEY ("comparison_group_id") REFERENCES "analyzer_comparison_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyzer_results" ADD CONSTRAINT "analyzer_results_normalized_row_id_fkey" FOREIGN KEY ("normalized_row_id") REFERENCES "import_normalized_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_comparison_group_id_fkey" FOREIGN KEY ("comparison_group_id") REFERENCES "analyzer_comparison_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_analyzer_result_id_fkey" FOREIGN KEY ("analyzer_result_id") REFERENCES "analyzer_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_alert_event_id_fkey" FOREIGN KEY ("alert_event_id") REFERENCES "alert_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

