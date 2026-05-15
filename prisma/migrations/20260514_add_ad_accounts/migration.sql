-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "owner_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_account_id_key" ON "ad_accounts"("account_id");

-- CreateIndex
CREATE INDEX "ad_accounts_is_active_idx" ON "ad_accounts"("is_active");
