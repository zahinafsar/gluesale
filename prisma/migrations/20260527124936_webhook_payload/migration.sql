-- AlterTable
ALTER TABLE "ProcessedWebhook" ADD COLUMN     "apiVersion" TEXT,
ADD COLUMN     "payload" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "ProcessedWebhook_shop_topic_createdAt_idx" ON "ProcessedWebhook"("shop", "topic", "createdAt");
