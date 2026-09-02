-- CreateEnum
CREATE TYPE "ProviderWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'SKIPPED');

-- AlterTable
ALTER TABLE "CountryPaymentMethod" ADD COLUMN     "countryProviderAccountId" TEXT;

-- CreateTable
CREATE TABLE "ProviderWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerRef" TEXT,
    "countryProviderAccountId" TEXT,
    "status" "ProviderWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_provider_eventType_idx" ON "ProviderWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_status_idx" ON "ProviderWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_providerRef_idx" ON "ProviderWebhookEvent"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWebhookEvent_provider_providerEventId_key" ON "ProviderWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "CountryPaymentMethod_countryProviderAccountId_idx" ON "CountryPaymentMethod"("countryProviderAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryProviderAccount_id_countryId_key" ON "CountryProviderAccount"("id", "countryId");

-- AddForeignKey
ALTER TABLE "CountryPaymentMethod" ADD CONSTRAINT "CountryPaymentMethod_countryProviderAccountId_countryId_fkey" FOREIGN KEY ("countryProviderAccountId", "countryId") REFERENCES "CountryProviderAccount"("id", "countryId") ON DELETE NO ACTION ON UPDATE NO ACTION;

