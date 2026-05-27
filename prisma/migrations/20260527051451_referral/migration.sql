-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('CLAIMED', 'CONVERTED', 'REJECTED_SELF', 'REJECTED_EXISTING', 'REJECTED_FRAUD', 'EXPIRED');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "programActive" BOOLEAN NOT NULL DEFAULT true,
    "refereePercent" INTEGER NOT NULL DEFAULT 10,
    "refereeMaxUses" INTEGER NOT NULL DEFAULT 1,
    "refereeMinSpend" INTEGER NOT NULL DEFAULT 0,
    "refererPercent" INTEGER NOT NULL DEFAULT 10,
    "rewardExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "fromEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referrer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "shopifyCustomerId" TEXT,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "friendEmail" TEXT NOT NULL,
    "refereeCodeId" TEXT,
    "refereeCode" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'CLAIMED',
    "orderId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "shopifyCodeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_shop_key" ON "Brand"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_code_key" ON "Referrer"("code");

-- CreateIndex
CREATE INDEX "Referrer_brandId_shopifyCustomerId_idx" ON "Referrer"("brandId", "shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_brandId_email_key" ON "Referrer"("brandId", "email");

-- CreateIndex
CREATE INDEX "Referral_brandId_status_idx" ON "Referral"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_brandId_friendEmail_key" ON "Referral"("brandId", "friendEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_referralId_key" ON "Reward"("referralId");

-- AddForeignKey
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
