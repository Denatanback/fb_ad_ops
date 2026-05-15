CREATE TABLE "target_cost_configs" (
    "id" TEXT NOT NULL,
    "scope" "analyzer_rule_scope" NOT NULL,
    "scope_key" TEXT NOT NULL,
    "approach_id" TEXT,
    "funnel_key" TEXT,
    "target_cost_usd" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_cost_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "target_cost_configs_scope_scope_key_key" ON "target_cost_configs"("scope", "scope_key");
CREATE INDEX "target_cost_configs_scope_approach_id_funnel_key_idx" ON "target_cost_configs"("scope", "approach_id", "funnel_key");

ALTER TABLE "target_cost_configs"
ADD CONSTRAINT "target_cost_configs_approach_id_fkey"
FOREIGN KEY ("approach_id") REFERENCES "approaches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
