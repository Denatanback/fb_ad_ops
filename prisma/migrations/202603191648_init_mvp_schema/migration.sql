-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "lifecycle_status" AS ENUM ('queue', 'active', 'stopped', 'scaling');

-- CreateEnum
CREATE TYPE "creative_label_key" AS ENUM ('winner', 'loser', 'top_ctr');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "role" "role" NOT NULL DEFAULT 'member',
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "approaches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approach_id" TEXT NOT NULL,
    "type" TEXT,
    "asset_url" TEXT,
    "preview_url" TEXT,
    "current_status" "lifecycle_status" NOT NULL DEFAULT 'queue',
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "approach_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launches" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "lander_id" TEXT,
    "setup_name" TEXT NOT NULL,
    "lifecycle_status" "lifecycle_status" NOT NULL DEFAULT 'queue',
    "launched_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launch_metrics" (
    "id" TEXT NOT NULL,
    "launch_id" TEXT NOT NULL,
    "cpc" DECIMAL(10,4),
    "ctr" DECIMAL(10,4),
    "cplpv" DECIMAL(10,4),
    "outbound_ctr" DECIMAL(10,4),
    "cpm" DECIMAL(10,4),
    "clicks" INTEGER,
    "cr" DECIMAL(10,4),
    "results" INTEGER,
    "cost_per_result" DECIMAL(10,4),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launch_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_labels" (
    "id" TEXT NOT NULL,
    "key" "creative_label_key" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_label_assignments" (
    "creative_id" TEXT NOT NULL,
    "creative_label_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_label_assignments_pkey" PRIMARY KEY ("creative_id","creative_label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "approaches_name_key" ON "approaches"("name");

-- CreateIndex
CREATE INDEX "approaches_created_by_id_idx" ON "approaches"("created_by_id");

-- CreateIndex
CREATE INDEX "approaches_updated_by_id_idx" ON "approaches"("updated_by_id");

-- CreateIndex
CREATE INDEX "creatives_approach_id_idx" ON "creatives"("approach_id");

-- CreateIndex
CREATE INDEX "creatives_current_status_idx" ON "creatives"("current_status");

-- CreateIndex
CREATE INDEX "creatives_created_by_id_idx" ON "creatives"("created_by_id");

-- CreateIndex
CREATE INDEX "creatives_updated_by_id_idx" ON "creatives"("updated_by_id");

-- CreateIndex
CREATE INDEX "landers_approach_id_idx" ON "landers"("approach_id");

-- CreateIndex
CREATE INDEX "landers_created_by_id_idx" ON "landers"("created_by_id");

-- CreateIndex
CREATE INDEX "landers_updated_by_id_idx" ON "landers"("updated_by_id");

-- CreateIndex
CREATE INDEX "launches_creative_id_idx" ON "launches"("creative_id");

-- CreateIndex
CREATE INDEX "launches_lander_id_idx" ON "launches"("lander_id");

-- CreateIndex
CREATE INDEX "launches_lifecycle_status_idx" ON "launches"("lifecycle_status");

-- CreateIndex
CREATE INDEX "launches_created_by_id_idx" ON "launches"("created_by_id");

-- CreateIndex
CREATE INDEX "launches_updated_by_id_idx" ON "launches"("updated_by_id");

-- CreateIndex
CREATE INDEX "launch_metrics_launch_id_captured_at_idx" ON "launch_metrics"("launch_id", "captured_at");

-- CreateIndex
CREATE INDEX "launch_metrics_created_by_id_idx" ON "launch_metrics"("created_by_id");

-- CreateIndex
CREATE INDEX "launch_metrics_updated_by_id_idx" ON "launch_metrics"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "creative_labels_key_key" ON "creative_labels"("key");

-- CreateIndex
CREATE INDEX "creative_label_assignments_creative_label_id_idx" ON "creative_label_assignments"("creative_label_id");

-- CreateIndex
CREATE INDEX "creative_label_assignments_assigned_by_id_idx" ON "creative_label_assignments"("assigned_by_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approaches" ADD CONSTRAINT "approaches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approaches" ADD CONSTRAINT "approaches_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landers" ADD CONSTRAINT "landers_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landers" ADD CONSTRAINT "landers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landers" ADD CONSTRAINT "landers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launches" ADD CONSTRAINT "launches_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launches" ADD CONSTRAINT "launches_lander_id_fkey" FOREIGN KEY ("lander_id") REFERENCES "landers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launches" ADD CONSTRAINT "launches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launches" ADD CONSTRAINT "launches_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_metrics" ADD CONSTRAINT "launch_metrics_launch_id_fkey" FOREIGN KEY ("launch_id") REFERENCES "launches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_metrics" ADD CONSTRAINT "launch_metrics_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_metrics" ADD CONSTRAINT "launch_metrics_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_label_assignments" ADD CONSTRAINT "creative_label_assignments_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_label_assignments" ADD CONSTRAINT "creative_label_assignments_creative_label_id_fkey" FOREIGN KEY ("creative_label_id") REFERENCES "creative_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_label_assignments" ADD CONSTRAINT "creative_label_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

