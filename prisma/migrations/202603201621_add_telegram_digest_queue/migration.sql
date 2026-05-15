-- CreateEnum
CREATE TYPE "notification_dispatch_mode" AS ENUM ('immediate', 'digest_30m');

-- CreateEnum
CREATE TYPE "notification_digest_status" AS ENUM ('queued', 'built', 'sent', 'failed', 'deferred');

-- CreateTable
CREATE TABLE "notification_digests" (
    "id" TEXT NOT NULL,
    "import_run_id" TEXT,
    "channel" "notification_channel" NOT NULL DEFAULT 'telegram',
    "destination_topic_key" "notification_topic_key" NOT NULL,
    "dispatch_mode" "notification_dispatch_mode" NOT NULL DEFAULT 'digest_30m',
    "digest_key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" "notification_digest_status" NOT NULL DEFAULT 'queued',
    "alert_count" INTEGER NOT NULL DEFAULT 0,
    "import_run_count" INTEGER NOT NULL DEFAULT 0,
    "message_title" TEXT,
    "message_body" TEXT,
    "built_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "retry_after_until" TIMESTAMP(3),
    "telegram_chat_id" TEXT,
    "telegram_thread_id" INTEGER,
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_digests_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add digest queue fields to alert_events
ALTER TABLE "alert_events"
    ADD COLUMN "notification_digest_id" TEXT,
    ADD COLUMN "dispatch_mode" "notification_dispatch_mode" NOT NULL DEFAULT 'immediate';

-- AlterTable: add digest FK to notification_deliveries
ALTER TABLE "notification_deliveries"
    ADD COLUMN "notification_digest_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notification_digests_digest_key_key" ON "notification_digests"("digest_key");

-- CreateIndex
CREATE INDEX "notification_digests_import_run_id_idx" ON "notification_digests"("import_run_id");

-- CreateIndex
CREATE INDEX "notification_digests_destination_topic_key_window_start_wind" ON "notification_digests"("destination_topic_key", "window_start", "window_end");

-- CreateIndex
CREATE INDEX "notification_digests_status_retry_after_until_window_end_idx" ON "notification_digests"("status", "retry_after_until", "window_end");

-- CreateIndex
CREATE INDEX "alert_events_notification_digest_id_idx" ON "alert_events"("notification_digest_id");

-- CreateIndex
CREATE INDEX "alert_events_dispatch_mode_created_at_idx" ON "alert_events"("dispatch_mode", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_digest_id_idx" ON "notification_deliveries"("notification_digest_id");

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_notification_digest_id_fkey" FOREIGN KEY ("notification_digest_id") REFERENCES "notification_digests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_digest_id_fkey" FOREIGN KEY ("notification_digest_id") REFERENCES "notification_digests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
