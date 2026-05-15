ALTER TABLE "ad_accounts"
ADD COLUMN "created_by_id" TEXT;

ALTER TABLE "ad_accounts"
ADD CONSTRAINT "ad_accounts_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ad_accounts_created_by_id_idx" ON "ad_accounts"("created_by_id");
