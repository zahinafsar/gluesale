-- Remove device-reuse feature (preventDeviceReuse + per-referral device fingerprints)
DROP INDEX "Referral_referrerId_ipHash_idx";

ALTER TABLE "Referral" DROP COLUMN "ipHash",
DROP COLUMN "userAgent";

ALTER TABLE "ReferralConfig" DROP COLUMN "preventDeviceReuse";
