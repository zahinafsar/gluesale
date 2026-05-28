-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Referrer" DROP CONSTRAINT "Referrer_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Reward" DROP CONSTRAINT "Reward_referralId_fkey";

-- DropForeignKey
ALTER TABLE "Reward" DROP CONSTRAINT "Reward_referrerId_fkey";

-- DropIndex
DROP INDEX "Referral_brandId_friendEmail_key";

-- DropIndex
DROP INDEX "Referral_brandId_status_idx";

-- DropIndex
DROP INDEX "Referrer_brandId_email_key";

-- DropIndex
DROP INDEX "Referrer_brandId_shopifyCustomerId_idx";

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "fromEmail",
DROP COLUMN "programActive",
DROP COLUMN "refereeMaxUses",
DROP COLUMN "refereeMinSpend",
DROP COLUMN "refereePercent",
DROP COLUMN "refererPercent",
DROP COLUMN "rewardExpiryDays";

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "brandId",
DROP COLUMN "friendEmail",
DROP COLUMN "refereeCode",
DROP COLUMN "refereeCodeId",
ADD COLUMN     "refereeDiscountId" TEXT,
ADD COLUMN     "refereeId" TEXT NOT NULL,
ADD COLUMN     "referralConfigId" TEXT NOT NULL,
ADD COLUMN     "referrerDiscountId" TEXT;

-- AlterTable
ALTER TABLE "Referrer" DROP COLUMN "brandId",
DROP COLUMN "email",
DROP COLUMN "firstOrderId",
DROP COLUMN "shopifyCustomerId",
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "referralConfigId" TEXT NOT NULL,
ADD COLUMN     "welcomeEmailedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Reward";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shopifyCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralConfig" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refereeDiscount" JSONB NOT NULL DEFAULT '{"type":"PERCENT","amount":10,"validity_seconds":2592000,"max_uses":1,"min_order_amount":0}',
    "referrerDiscount" JSONB NOT NULL DEFAULT '{"type":"PERCENT","amount":10,"validity_seconds":2592000,"max_uses":1,"min_order_amount":0}',
    "maxReferralsPerUser" INTEGER,
    "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT true,
    "preventDeviceReuse" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" TEXT NOT NULL,
    "referralConfigId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "shopifyCodeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_brandId_shopifyCustomerId_idx" ON "Customer"("brandId", "shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_brandId_email_key" ON "Customer"("brandId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralConfig_brandId_key" ON "ReferralConfig"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Referee_customerId_key" ON "Referee"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeDiscountId_key" ON "Referral"("refereeDiscountId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerDiscountId_key" ON "Referral"("referrerDiscountId");

-- CreateIndex
CREATE INDEX "Referral_referralConfigId_status_idx" ON "Referral"("referralConfigId", "status");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_referrerId_ipHash_idx" ON "Referral"("referrerId", "ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_customerId_key" ON "Referrer"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralConfig" ADD CONSTRAINT "ReferralConfig_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_referralConfigId_fkey" FOREIGN KEY ("referralConfigId") REFERENCES "ReferralConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_referralConfigId_fkey" FOREIGN KEY ("referralConfigId") REFERENCES "ReferralConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralConfigId_fkey" FOREIGN KEY ("referralConfigId") REFERENCES "ReferralConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeDiscountId_fkey" FOREIGN KEY ("refereeDiscountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerDiscountId_fkey" FOREIGN KEY ("referrerDiscountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

