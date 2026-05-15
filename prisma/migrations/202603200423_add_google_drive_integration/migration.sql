-- AlterTable
ALTER TABLE "creatives" ADD COLUMN     "drive_download_url" TEXT,
ADD COLUMN     "drive_file_id" TEXT,
ADD COLUMN     "drive_web_view_link" TEXT,
ADD COLUMN     "source_byte_size" INTEGER,
ADD COLUMN     "source_filename" TEXT,
ADD COLUMN     "source_mime_type" TEXT,
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "thumbnail_url" TEXT;

-- CreateTable
CREATE TABLE "google_drive_integrations" (
    "id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL DEFAULT 'google_drive',
    "google_account_id" TEXT,
    "google_account_email" TEXT,
    "google_account_name" TEXT,
    "scope" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_type" TEXT,
    "expires_at" TIMESTAMP(3),
    "drive_folder_id" TEXT,
    "drive_folder_name" TEXT,
    "connected_by_id" TEXT,
    "updated_by_id" TEXT,
    "connected_at" TIMESTAMP(3),
    "last_validated_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_drive_integrations_provider_key_key" ON "google_drive_integrations"("provider_key");

-- CreateIndex
CREATE INDEX "google_drive_integrations_connected_by_id_idx" ON "google_drive_integrations"("connected_by_id");

-- CreateIndex
CREATE INDEX "google_drive_integrations_updated_by_id_idx" ON "google_drive_integrations"("updated_by_id");

-- CreateIndex
CREATE INDEX "creatives_drive_file_id_idx" ON "creatives"("drive_file_id");

-- AddForeignKey
ALTER TABLE "google_drive_integrations" ADD CONSTRAINT "google_drive_integrations_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_drive_integrations" ADD CONSTRAINT "google_drive_integrations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

