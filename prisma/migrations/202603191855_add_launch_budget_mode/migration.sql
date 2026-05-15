-- CreateEnum
CREATE TYPE "budget_mode" AS ENUM ('adset', 'campaign');

-- AlterTable
ALTER TABLE "launches"
ADD COLUMN "budget_mode" "budget_mode" NOT NULL DEFAULT 'adset';

-- CreateIndex
CREATE INDEX "launches_budget_mode_idx" ON "launches"("budget_mode");
