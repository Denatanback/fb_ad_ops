-- AlterTable
ALTER TABLE "creatives" ADD COLUMN "drive_folder_id" TEXT;
ALTER TABLE "creatives" ADD COLUMN "drive_folder_name" TEXT;

-- CreateIndex
CREATE INDEX "creatives_drive_folder_id_idx" ON "creatives"("drive_folder_id");
