-- CreateTable
CREATE TABLE "hypotheses" (
    "id" TEXT NOT NULL,
    "approach_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creative_concept" TEXT,
    "results" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hypotheses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hypotheses_approach_id_idx" ON "hypotheses"("approach_id");

-- AddForeignKey
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_approach_id_fkey" FOREIGN KEY ("approach_id") REFERENCES "approaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "notification_digests_destination_topic_key_window_start_wind" RENAME TO "notification_digests_destination_topic_key_window_start_win_idx";
