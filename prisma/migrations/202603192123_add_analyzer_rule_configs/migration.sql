-- CreateEnum
CREATE TYPE "analyzer_rule_scope" AS ENUM ('global', 'approach', 'funnel');

-- CreateEnum
CREATE TYPE "analyzer_rule_stage" AS ENUM ('watchdog', 'benchmark');

-- CreateEnum
CREATE TYPE "analyzer_rule_key" AS ENUM ('outbound_ctr', 'cplpv', 'spend_no_results_creative', 'spend_no_results_adset');

-- CreateEnum
CREATE TYPE "analyzer_metric_key" AS ENUM ('outbound_ctr', 'cplpv', 'spend');

-- CreateEnum
CREATE TYPE "notification_topic_key" AS ENUM ('conversions', 'needs_review', 'strong_signals', 'import_errors_tech', 'bot_test');

-- CreateTable
CREATE TABLE "analyzer_rule_configs" (
    "id" TEXT NOT NULL,
    "rule_key" "analyzer_rule_key" NOT NULL,
    "metric_key" "analyzer_metric_key" NOT NULL,
    "rule_stage" "analyzer_rule_stage" NOT NULL DEFAULT 'watchdog',
    "scope" "analyzer_rule_scope" NOT NULL,
    "scope_key" TEXT NOT NULL,
    "approach_id" TEXT,
    "funnel_key" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "severity" "alert_severity" NOT NULL DEFAULT 'warning',
    "destination_topic_key" "notification_topic_key" NOT NULL DEFAULT 'needs_review',
    "reason_code" TEXT,
    "min_value" DECIMAL(12,4),
    "max_value" DECIMAL(12,4),
    "spend_threshold" DECIMAL(12,4),
    "max_results" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyzer_rule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analyzer_rule_configs_scope_approach_id_funnel_key_idx" ON "analyzer_rule_configs"("scope", "approach_id", "funnel_key");

-- CreateIndex
CREATE INDEX "analyzer_rule_configs_destination_topic_key_severity_idx" ON "analyzer_rule_configs"("destination_topic_key", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "analyzer_rule_configs_rule_key_scope_key_key" ON "analyzer_rule_configs"("rule_key", "scope_key");

-- AddForeignKey
ALTER TABLE "analyzer_rule_configs" ADD CONSTRAINT "analyzer_rule_configs_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

