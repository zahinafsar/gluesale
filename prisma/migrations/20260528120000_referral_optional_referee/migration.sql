-- Make Referral.refereeId optional (anonymous claims linked to a referee later)
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_refereeId_fkey";

ALTER TABLE "Referral" ALTER COLUMN "refereeId" DROP NOT NULL;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
